package scope

import (
	"github.com/dbo-studio/dbo/internal/app/dto"
	"gorm.io/gorm"
)

func Paginate(dto *dto.PaginationRequest) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		page := 0
		count := 0

		if dto != nil {
			if dto.Page != nil {
				page = *dto.Page
			}

			if dto.Count != nil {
				count = *dto.Count
			}
		}

		if page <= 0 {
			page = 1
		}

		switch {
		case count > 100:
			count = 100
		case count <= 0:
			count = 10
		}

		offset := (page - 1) * count
		return db.Offset(offset).Limit(count)
	}
}
