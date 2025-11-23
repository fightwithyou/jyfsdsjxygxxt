// 飞书应用配置示例
// 复制此文件为 config.js 并填写你的真实配置信息

const FEISHU_CONFIG = {
    appId: 'your_app_id',           // 你的 app_id（从飞书开放平台获取）
    appSecret: 'your_app_secret',   // 你的 app_secret（从飞书开放平台获取）
    // 飞书在线表格的 token
    // 这个需要通过飞书开放平台获取，或者从 URL 中提取
    spreadsheetToken: 'your_spreadsheet_token',  // 在线表格的 token（从 URL 中提取）
    // 工作表 ID
    sheets: {
        config: 'your_config_sheet_id',        // 配置表的 sheet ID
        models: 'your_models_sheet_id',        // 模型列表的 sheet ID
        lineage: 'your_lineage_sheet_id',     // 血缘关系表的 sheet ID
        permissions: 'your_permissions_sheet_id'    // 用户权限表的 sheet ID（可选）
    }
};

// 配置表列索引（从 0 开始）
const CONFIG_COLUMNS = {
    type: 0,      // 类型 (A列)
    name: 1,      // 名称 (B列)
    description: 2, // 描述 (C列)
    sort: 3,      // 排序 (D列)
    status: 4     // 状态 (E列)
};

// 模型列表列索引
const MODELS_COLUMNS = {
    modelId: 0,        // 模型ID (A列)
    modelName: 1,      // 模型名称 (B列)
    modelComment: 2,   // 模型注释 (C列)
    level: 3,          // 层级 (D列)
    subject: 4,        // 主题域 (E列)
    createTime: 5,     // 创建时间 (F列)
    updateTime: 6,     // 更新时间 (G列)
    creator: 7,        // 创建人 (H列)
    status: 8          // 状态 (I列)
};

// 血缘关系表列索引
const LINEAGE_COLUMNS = {
    relationId: 0,     // 关系ID (A列)
    sourceModelId: 1,  // 来源模型ID (B列)
    targetModelId: 2,  // 目标模型ID (C列)
    taskName: 3,       // 任务名称 (D列)
    taskLocation: 4,   // 任务位置 (E列)
    scheduleName: 5,   // 调度名称 (F列)
    scheduleLocation: 6, // 调度文件位置 (G列)
    remarks: 7,        // 备注 (H列)
    createTime: 8,     // 创建时间 (I列)
    updateTime: 9,     // 更新时间 (J列)
    creator: 10,       // 创建人 (K列)
    status: 11         // 状态 (L列)
};

