package databaseRedis

import (
	"context"
	"errors"
	"strconv"
	"strings"
)

func (r *Repository) ServerInfo(ctx context.Context, panel string) ([]string, [][]any, error) {
	var section string

	switch panel {
	case "operations":
		client := r.client(0).Conn()
		defer client.Close()

		id, err := client.ClientID(ctx).Result()
		if err != nil {
			return nil, nil, err
		}

		list, err := client.ClientList(ctx).Result()
		if err != nil {
			return nil, nil, err
		}

		rows := [][]any{}

		for _, line := range strings.Split(list, "\n") {
			fields := clientFields(line)
			if fields["id"] != "" && fields["id"] != strconv.FormatInt(id, 10) {
				rows = append(rows, []any{fields["id"], fields["user"], fields["addr"], fields["db"], fields["cmd"], fields["addr"]})
			}
		}

		return []string{"ID", "User", "Address", "Database", "Command", "Target"}, rows, nil
	case "users":
		users, err := r.client(0).ACLUsers(ctx).Result()
		if err != nil {
			return nil, nil, err
		}

		rows := make([][]any, 0, len(users))
		for _, user := range users {
			rows = append(rows, []any{user})
		}

		return []string{"User"}, rows, nil
	case "status":
		section = "default"
	case "databases":
		section = "keyspace"
	default:
		return nil, nil, errors.New("server panel is unavailable")
	}

	info, err := r.client(0).Info(ctx, section).Result()
	if err != nil {
		return nil, nil, err
	}

	fields := map[string]string{}

	for _, line := range strings.Split(info, "\n") {
		key, value, found := strings.Cut(strings.TrimSpace(line), ":")
		if found {
			fields[key] = value
		}
	}

	rows := [][]any{}

	if panel == "databases" {
		for _, line := range strings.Split(info, "\n") {
			name, stats, found := strings.Cut(strings.TrimSpace(line), ":")
			if found && strings.HasPrefix(name, "db") {
				rows = append(rows, []any{name, stats})
			}
		}

		return []string{"Database", "Keyspace"}, rows, nil
	}

	for _, item := range [][2]string{
		{"version", "redis_version"}, {"uptime", "uptime_in_seconds"}, {"connections", "connected_clients"},
		{"memory", "used_memory_human"}, {"role", "role"},
	} {
		if value, ok := fields[item[1]]; ok {
			rows = append(rows, []any{item[0], value})
		}
	}

	return []string{"Metric", "Value"}, rows, nil
}

func clientFields(line string) map[string]string {
	out := make(map[string]string)

	for _, entry := range strings.Fields(line) {
		key, value, found := strings.Cut(entry, "=")
		if found {
			out[key] = value
		}
	}

	return out
}

func (r *Repository) DisconnectClient(ctx context.Context, id, address string) error {
	clientID, err := strconv.ParseUint(id, 10, 64)
	if err != nil || clientID == 0 || address == "" {
		return errors.New("invalid client target")
	}

	n, err := r.client(0).ClientKillByFilter(ctx, "ID", strconv.FormatUint(clientID, 10), "ADDR", address, "SKIPME", "YES").Result()
	if err != nil {
		return err
	}

	if n != 1 {
		return errors.New("client is no longer connected")
	}

	return nil
}
