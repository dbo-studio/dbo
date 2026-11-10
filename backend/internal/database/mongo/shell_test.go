package databaseMongo

import (
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
)

func TestNormalizeShell(t *testing.T) {
	cases := map[string]string{
		`db.users.find({age: {$gt: 30}})`:                            `db.users.find({"age": {"$gt": 30}})`,
		`db.users.find({'name': 'o\'neil'})`:                         `db.users.find({"name": "o'neil"})`,
		`db.users.find({"a": 1,})`:                                   `db.users.find({"a": 1})`,
		`db.users.find({_id: ObjectId('507f1f77bcf86cd799439011')})`: `db.users.find({"_id": {"$oid":"507f1f77bcf86cd799439011"}})`,
		`db.e.find({at: {$gte: ISODate("2024-01-02T00:00:00Z")}})`:   `db.e.find({"at": {"$gte": {"$date":"2024-01-02T00:00:00Z"}}})`,
		`db.e.find({at: new Date('2024-03-04')})`:                    `db.e.find({"at": {"$date":"2024-03-04T00:00:00Z"}})`,
		`db.e.find({at: new Date(1700000000000)})`:                   `db.e.find({"at": {"$date":{"$numberLong":"1700000000000"}}})`,
		`db.e.find({n: NumberLong(5), m: NumberInt(3)})`:             `db.e.find({"n": {"$numberLong":"5"}, "m": 3})`,
		`db.u.find({name: /^a.c/i})`:                                 `db.u.find({"name": {"$regularExpression":{"pattern":"^a.c","options":"i"}}})`,
		"db.u.find({a: 1}) // trailing comment":                      `db.u.find({"a": 1}) `,
		`db.u.find(/* all */ {})`:                                    `db.u.find( {})`,
		`db.u.find({"already": "json", "n": [1, 2]})`:                `db.u.find({"already": "json", "n": [1, 2]})`,
	}

	for in, want := range cases {
		got, err := normalizeShell(in)
		if err != nil {
			t.Fatalf("%s: %v", in, err)
		}

		if got != want {
			t.Errorf("normalize(%s)\n got %s\nwant %s", in, got, want)
		}
	}

	for _, bad := range []string{`db.u.find({a: 'open`, `db.u.find(/* open`} {
		if _, err := normalizeShell(bad); err == nil {
			t.Errorf("%s: expected an error", bad)
		}
	}
}

func TestSplitStatements(t *testing.T) {
	cases := map[string][]string{
		`use shop; db.users.find({})`:                     {"use shop", "db.users.find({})"},
		"use shop\ndb.users.find({})\ndb.a.count()":       {"use shop", "db.users.find({})", "db.a.count()"},
		"db.users.find({})\n  .sort({a: 1})\n  .limit(2)": {"db.users.find({})\n  .sort({a: 1})\n  .limit(2)"},
		`db.a.insertOne({s: "x; y"}); db.a.count()`:       {`db.a.insertOne({s: "x; y"})`, "db.a.count()"},
		"db.a.find({\n a: 1\n})":                          {"db.a.find({\n a: 1\n})"},
		"db.a.count() // one; two\ndb.b.count()":          {"db.a.count() // one; two", "db.b.count()"},
		"":                                                nil,
	}

	for in, want := range cases {
		got := splitStatements(in)
		if len(got) != len(want) {
			t.Errorf("split(%q) = %q, want %q", in, got, want)

			continue
		}

		for i := range want {
			if got[i] != want[i] {
				t.Errorf("split(%q)[%d] = %q, want %q", in, i, got[i], want[i])
			}
		}
	}
}

func TestClassifyCommand(t *testing.T) {
	cases := map[string]contract.SafetyClass{
		`db.users.find({age: {$gt: 1}})`:                       contract.SafetyRead,
		`show collections`:                                     contract.SafetyRead,
		`use shop; db.users.find({})`:                          contract.SafetyRead,
		`db.users.insertOne({a: 1})`:                           contract.SafetyWrite,
		`use shop; db.users.find({}); db.users.deleteMany({})`: contract.SafetyDestructive,
		`db.users.drop()`:                                      contract.SafetyDestructive,
		`db.users.dropIndex('a_1')`:                            contract.SafetyDestructive,
		`db.users.bulkWrite([{insertOne: {document: {}}}])`:    contract.SafetyDestructive,
		`db.users.findOneAndUpdate({a: 1}, {$set: {a: 2}})`:    contract.SafetyWrite,
		`db.createCollection('x')`:                             contract.SafetyWrite,
		`db.getCollection('a.b').find()`:                       contract.SafetyRead,
		`db.users.find({$where: 'sleep(1000)'})`:               contract.SafetyBlocked,
		`db.users.find({"$where": "1"})`:                       contract.SafetyBlocked,
		`db.users.aggregate([{$out: 'x'}])`:                    contract.SafetyBlocked,
		`db.users.aggregate([{ $merge: {into: 'x'} }])`:        contract.SafetyBlocked,
		`db.runCommand({ping: 1})`:                             contract.SafetyBlocked,
		`db.users.mapReduce()`:                                 contract.SafetyBlocked,
		`rm -rf /`:                                             contract.SafetyBlocked,
		`db.users.find({}); eval('1')`:                         contract.SafetyBlocked,
	}

	for in, want := range cases {
		if got := classifyCommand(in); got != want {
			t.Errorf("classify(%q) = %s, want %s", in, got, want)
		}
	}
}

func TestParseCallCollections(t *testing.T) {
	c, err := parseCall(`db.getCollection("a.b").find({}).sort({x: 1})`)
	if err != nil || c.coll != "a.b" || c.method != "find" || len(c.chain) != 1 {
		t.Fatalf("getCollection: %+v %v", c, err)
	}

	c, err = parseCall(`db.createCollection("logs")`)
	if err != nil || c.method != "createCollection" || len(c.args) != 1 {
		t.Fatalf("createCollection: %+v %v", c, err)
	}
}
