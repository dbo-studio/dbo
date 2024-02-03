import { cleanObject } from "@/utils"

export const transformTableData = (data: any) => {
    return cleanObject({
        columns : data?.column_data,
    })
}