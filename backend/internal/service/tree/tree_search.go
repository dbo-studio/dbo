package serviceTree

import (
	"context"
	"strings"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/database"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/samber/lo"
)

const (
	defaultSearchLimit = 200
	// Bounds for walking a large server: level fetches and wall time. Hitting either marks the result truncated.
	maxSearchLevelFetches = 400
	searchTimeout         = 8 * time.Second
	treeLevelCacheTTL     = 30 * time.Minute
)

type TreeSearchResult struct {
	Node contract.TreeNode   `json:"node"`
	Path []contract.TreeNode `json:"path"`
}

type TreeSearchResponse struct {
	Results   []TreeSearchResult `json:"results"`
	Truncated bool               `json:"truncated"`
}

type treeLevelFetcher func(ctx context.Context, parentID string) (*contract.TreeNode, error)

// Search finds nodes whose name contains the query anywhere in the connection's tree, including folders
// that were never opened in the UI. It walks the same per-level builders as Tree (and shares their cache),
// so results carry the exact ids, actions and context menus the client already understands.
func (i ITreeServiceImpl) Search(ctx context.Context, req *dto.TreeSearchRequest) (*TreeSearchResponse, error) {
	connection, err := i.connectionRepo.Find(ctx, req.ConnectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	repo, err := database.NewDatabaseRepository(ctx, connection, i.cm)
	if err != nil {
		return nil, err
	}

	ownerID := helper.CtxOwnerID(ctx)
	fetch := func(ctx context.Context, parentID string) (*contract.TreeNode, error) {
		key := cache.TreeKey(ownerID, connection.ID, parentID)
		var cached *contract.TreeNode
		if err := i.cache.Get(ctx, key, &cached); err == nil && cached != nil {
			return cached, nil
		}

		node, err := repo.Tree(ctx, parentID)
		if err != nil {
			return nil, err
		}
		_ = i.cache.Set(ctx, key, node, lo.ToPtr(treeLevelCacheTTL))
		return node, nil
	}

	limit := req.Limit
	if limit <= 0 {
		limit = defaultSearchLimit
	}

	ctx, cancel := context.WithTimeout(ctx, searchTimeout)
	defer cancel()

	return searchTree(ctx, fetch, req.Query, limit, maxSearchLevelFetches)
}

func searchTree(ctx context.Context, fetch treeLevelFetcher, query string, limit, maxFetches int) (*TreeSearchResponse, error) {
	root, err := fetch(ctx, "")
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	needle := strings.ToLower(strings.TrimSpace(query))
	result := &TreeSearchResponse{Results: make([]TreeSearchResult, 0)}

	type item struct {
		node contract.TreeNode
		path []contract.TreeNode
	}

	// Breadth-first, so shallow matches (databases, schemas) come before deep ones when the limit cuts in.
	queue := []item{}
	rootPath := []contract.TreeNode{shallow(*root)}
	for _, child := range root.Children {
		queue = append(queue, item{node: child, path: rootPath})
	}

	fetches := 1
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		if strings.Contains(strings.ToLower(current.node.Name), needle) {
			result.Results = append(result.Results, TreeSearchResult{Node: shallow(current.node), Path: current.path})
			if len(result.Results) >= limit {
				result.Truncated = len(queue) > 0
				return result, nil
			}
		}

		if !current.node.HasChildren {
			continue
		}

		children := current.node.Children
		if len(children) == 0 {
			if fetches >= maxFetches || ctx.Err() != nil {
				result.Truncated = true
				continue
			}
			fetches++
			level, err := fetch(ctx, current.node.ID)
			if err != nil {
				// One unreadable database or schema must not hide matches from the rest of the server.
				continue
			}
			children = level.Children
		}

		path := append(append([]contract.TreeNode{}, current.path...), shallow(current.node))
		for _, child := range children {
			queue = append(queue, item{node: child, path: path})
		}
	}

	return result, nil
}

// shallow drops children so each result only carries the node itself.
func shallow(node contract.TreeNode) contract.TreeNode {
	node.Children = make([]contract.TreeNode, 0)
	return node
}
