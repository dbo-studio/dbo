package databaseMongo

import (
	"testing"

	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func TestIDRoundTrip(t *testing.T) {
	oid := bson.NewObjectID()

	for _, v := range []any{oid, "alice", "12", "64b7f0000000000000000001", `{"x":1}`, int32(5), int64(5), 5.5, true, "true"} {
		got := parseID(idString(v))
		a, _ := canonical(bson.D{{Key: "_id", Value: v}})
		b, _ := canonical(bson.D{{Key: "_id", Value: got}})

		if a != b {
			t.Errorf("id %#v -> %q -> %#v (types must survive)", v, idString(v), got)
		}
	}

	if idString(oid) != oid.Hex() {
		t.Error("an ObjectId shows as its hex digits")
	}
}

func TestParseDocKeepsTypes(t *testing.T) {
	d, err := parseDoc(`{"n":{"$numberLong":"30"},"d":{"$date":{"$numberLong":"1700000000000"}}}`)
	if err != nil {
		t.Fatal(err)
	}

	out, _ := canonical(d)
	if out != `{"n":{"$numberLong":"30"},"d":{"$date":{"$numberLong":"1700000000000"}}}` {
		t.Fatalf("round trip changed types: %s", out)
	}
}

func TestBlockedOperators(t *testing.T) {
	for _, bad := range []string{
		`{"$where":"sleep(1000)"}`,
		`{"a":{"$function":{"body":"x","args":[],"lang":"js"}}}`,
		`[{"$out":"x"}]`,
		`[{"$merge":{"into":"x"}}]`,
	} {
		if checkJSON(bad) == nil {
			t.Errorf("%s must be refused", bad)
		}
	}

	if checkJSON(`{"age":{"$gt":30},"name":"where out merge"}`) != nil {
		t.Error("plain values that contain the words are fine")
	}
}

func TestClassify(t *testing.T) {
	r := &Repository{}

	cases := map[string]contract.SafetyClass{
		`db.users.find({"a":1}).limit(5)`:           contract.SafetyRead,
		`db.users.aggregate([{"$match":{}}])`:       contract.SafetyRead,
		`db.users.aggregate([{"$out":"copy"}])`:     contract.SafetyBlocked,
		`db.users.insertOne({"a":1})`:               contract.SafetyWrite,
		`db.users.updateMany({}, {"$set":{"a":1}})`: contract.SafetyWrite,
		`db.users.deleteMany({})`:                   contract.SafetyDestructive,
		`db.users.drop()`:                           contract.SafetyBlocked,
		`db.users.find({"$where":"1==1"})`:          contract.SafetyBlocked,
		`show dbs`:                                  contract.SafetyRead,
		`use shop`:                                  contract.SafetyRead,
		`rm -rf /`:                                  contract.SafetyBlocked,
		`db.users.find({"a":1}`:                     contract.SafetyBlocked,
	}

	for in, want := range cases {
		if got := r.Classify(contract.Operation{Name: "command", Raw: in}); got != want {
			t.Errorf("%s = %s, want %s", in, got, want)
		}
	}

	if r.Classify(contract.Operation{Name: "browse", Raw: `{"$where":"x"}`}) != contract.SafetyBlocked {
		t.Error("browse with $where must be blocked")
	}
}

func TestParseCall(t *testing.T) {
	c, err := parseCall(`db.users.find({"name":"a, (b)","n":{"$gt":1}}, {"name":1}).sort({"n":-1}).limit(3)`)
	if err != nil {
		t.Fatal(err)
	}

	if c.coll != "users" || c.method != "find" || len(c.args) != 2 || len(c.chain) != 2 || c.chain[1].arg != "3" {
		t.Fatalf("unexpected parse: %+v", c)
	}

	for _, bad := range []string{`db.users.find({`, `users.find()`, `db.users.find({}) extra`} {
		if _, err := parseCall(bad); err == nil {
			t.Errorf("%q must not parse", bad)
		}
	}
}

func TestSplitContainer(t *testing.T) {
	db, coll, err := splitContainer("shop/orders/2024")
	if err != nil || db != "shop" || coll != "orders/2024" {
		t.Fatalf("got %q %q %v", db, coll, err)
	}

	if _, _, err := splitContainer("nodb"); err == nil {
		t.Error("a container needs database and collection")
	}
}
