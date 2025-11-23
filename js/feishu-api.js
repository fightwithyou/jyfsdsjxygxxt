/**
 * 飞书API封装类
 * 负责与飞书在线表格进行交互
 */
class FeishuAPI {
    constructor(config) {
        this.config = config;
        this.accessToken = null;
        this.tenantAccessToken = null;
        this.ttl = 0;
    }

    /**
     * 获取 tenant_access_token
     * 用于调用飞书开放平台API
     */
    async getTenantAccessToken() {
        try {
            // 如果 token 未过期，直接返回
            if (this.tenantAccessToken && Date.now() < this.ttl) {
                return this.tenantAccessToken;
            }

            const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    app_id: this.config.appId,
                    app_secret: this.config.appSecret
                })
            });

            const data = await response.json();
            
            if (data.code === 0) {
                this.tenantAccessToken = data.tenant_access_token;
                // token 有效期通常是 2 小时，提前 5 分钟刷新
                this.ttl = Date.now() + (data.expire - 300) * 1000;
                return this.tenantAccessToken;
            } else {
                throw new Error(`获取 tenant_access_token 失败: ${data.msg}`);
            }
        } catch (error) {
            console.error('获取 tenant_access_token 错误:', error);
            throw error;
        }
    }

    /**
     * 调用飞书API的通用方法
     */
    async callAPI(url, options = {}) {
        const token = await this.getTenantAccessToken();
        
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json; charset=utf-8'
            }
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        // 如果 body 是字符串，保持不变；如果是对象，序列化
        if (finalOptions.body && typeof finalOptions.body === 'object') {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        const response = await fetch(url, finalOptions);
        const data = await response.json();

        if (data.code !== 0) {
            throw new Error(`API调用失败: ${data.msg || JSON.stringify(data)}`);
        }

        return data.data;
    }

    /**
     * 读取工作表数据
     * @param {string} sheetId - 工作表ID
     * @param {string} range - 数据范围，例如 "A1:Z1000"
     */
    async readSheetData(sheetId, range = '') {
        const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${this.config.spreadsheetToken}/values/${sheetId}${range ? '!' + range : ''}`;
        const data = await this.callAPI(url);
        return data;
    }

    /**
     * 写入工作表数据
     * @param {string} sheetId - 工作表ID
     * @param {string} range - 数据范围，例如 "A1"
     * @param {Array} values - 二维数组，表示要写入的数据
     */
    async writeSheetData(sheetId, range, values) {
        const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${this.config.spreadsheetToken}/values/${sheetId}!${range}`;
        
        return await this.callAPI(url, {
            method: 'PUT',
            body: {
                valueRange: {
                    range: `${sheetId}!${range}`,
                    values: values
                }
            }
        });
    }

    /**
     * 追加行数据
     * @param {string} sheetId - 工作表ID
     * @param {Array} values - 一维数组，表示要追加的行数据
     */
    async appendRow(sheetId, values) {
        // 先读取现有数据，找到最后一行的行号
        try {
            const data = await this.readSheetData(sheetId);
            const rows = data.valueRange?.values || data.values || [];
            const nextRow = rows.length + 1;
            
            // 写入新行
            return await this.writeSheetData(sheetId, `A${nextRow}`, [values]);
        } catch (error) {
            // 如果读取失败，尝试追加
            const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${this.config.spreadsheetToken}/values/${sheetId}!A:Z:append`;
            
            return await this.callAPI(url, {
                method: 'POST',
                body: {
                    valueRange: {
                        range: `${sheetId}!A:Z`,
                        values: [values]
                    },
                    insertDataOption: 'INSERT_ROWS'
                }
            });
        }
    }

    /**
     * 删除行
     * @param {string} sheetId - 工作表ID
     * @param {number} startRow - 起始行号（从1开始）
     * @param {number} endRow - 结束行号（从1开始）
     */
    async deleteRows(sheetId, startRow, endRow) {
        const url = `https://open.feishu.cn/open-apis/sheets/v2/spreadsheets/${this.config.spreadsheetToken}/sheets/${sheetId}/delete_dimension`;
        
        return await this.callAPI(url, {
            method: 'DELETE',
            body: {
                dimension: {
                    sheetId: sheetId,
                    majorDimension: 'ROWS',
                    startIndex: startRow - 1, // API使用的是0-based索引
                    endIndex: endRow
                }
            }
        });
    }

    /**
     * 读取配置表数据
     */
    async getConfigData() {
        const data = await this.readSheetData(this.config.sheets.config);
        const rows = data.valueRange?.values || data.values || [];
        
        // 跳过表头
        const configRows = rows.slice(1);
        
        const levels = [];      // 层级列表
        const subjects = [];    // 主题域列表
        
        configRows.forEach(row => {
            const type = row[CONFIG_COLUMNS.type] || '';
            const name = row[CONFIG_COLUMNS.name] || '';
            const status = row[CONFIG_COLUMNS.status] || '';
            
            // 只取状态为"有效"的配置
            if (status !== '有效') return;
            
            if (type === '层级') {
                levels.push(name);
            } else if (type === '主题域') {
                subjects.push(name);
            }
        });
        
        return { levels, subjects };
    }

    /**
     * 读取模型列表数据
     */
    async getModelsData() {
        const data = await this.readSheetData(this.config.sheets.models);
        const rows = data.valueRange?.values || data.values || [];
        
        // 跳过表头
        return rows.slice(1).map((row, index) => ({
            rowIndex: index + 2, // 实际行号（从2开始，因为第1行是表头）
            modelId: row[MODELS_COLUMNS.modelId] || '',
            modelName: row[MODELS_COLUMNS.modelName] || '',
            modelComment: row[MODELS_COLUMNS.modelComment] || '',
            level: row[MODELS_COLUMNS.level] || '',
            subject: row[MODELS_COLUMNS.subject] || '',
            createTime: row[MODELS_COLUMNS.createTime] || '',
            updateTime: row[MODELS_COLUMNS.updateTime] || '',
            creator: row[MODELS_COLUMNS.creator] || '',
            status: row[MODELS_COLUMNS.status] || ''
        })).filter(model => model.status === '有效' || model.status === ''); // 过滤有效的模型
    }

    /**
     * 读取血缘关系数据
     */
    async getLineageData() {
        const data = await this.readSheetData(this.config.sheets.lineage);
        const rows = data.valueRange?.values || data.values || [];
        
        // 跳过表头
        return rows.slice(1).map((row, index) => ({
            rowIndex: index + 2, // 实际行号
            relationId: row[LINEAGE_COLUMNS.relationId] || '',
            sourceModelId: row[LINEAGE_COLUMNS.sourceModelId] || '',
            targetModelId: row[LINEAGE_COLUMNS.targetModelId] || '',
            taskName: row[LINEAGE_COLUMNS.taskName] || '',
            taskLocation: row[LINEAGE_COLUMNS.taskLocation] || '',
            scheduleName: row[LINEAGE_COLUMNS.scheduleName] || '',
            scheduleLocation: row[LINEAGE_COLUMNS.scheduleLocation] || '',
            remarks: row[LINEAGE_COLUMNS.remarks] || '',
            createTime: row[LINEAGE_COLUMNS.createTime] || '',
            updateTime: row[LINEAGE_COLUMNS.updateTime] || '',
            creator: row[LINEAGE_COLUMNS.creator] || '',
            status: row[LINEAGE_COLUMNS.status] || ''
        })).filter(relation => relation.status === '有效' || relation.status === ''); // 过滤有效的关系
    }

    /**
     * 根据层级和模型名称查找模型
     * @param {string} level - 层级
     * @param {string} modelName - 模型名称（支持模糊匹配）
     */
    async findModel(level, modelName) {
        const models = await this.getModelsData();
        const lowerModelName = modelName.toLowerCase();
        
        return models.filter(model => {
            const matchLevel = !level || model.level === level;
            const matchName = !modelName || model.modelName.toLowerCase().includes(lowerModelName);
            return matchLevel && matchName;
        });
    }

    /**
     * 添加模型
     */
    async addModel(modelData) {
        const { modelName, level, modelComment, subject, creator } = modelData;
        
        // 检查模型是否已存在
        const existingModels = await this.findModel(level, modelName);
        const exactMatch = existingModels.find(m => m.level === level && m.modelName === modelName);
        
        if (exactMatch) {
            throw new Error(`该数仓层级已经存在该模型`);
        }
        
        // 生成模型ID：层级.层级_模型名称
        const modelId = `${level}.${level}_${modelName}`;
        const now = new Date().toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const rowData = [
            modelId,
            modelName,
            modelComment,
            level,
            subject,
            now,
            '', // 更新时间
            creator || 'system',
            '有效' // 状态
        ];
        
        await this.appendRow(this.config.sheets.models, rowData);
        return { success: true, modelId };
    }

    /**
     * 删除模型及其相关血缘关系
     */
    async deleteModel(level, modelName) {
        const models = await this.findModel(level, modelName);
        const exactMatch = models.find(m => m.level === level && m.modelName === modelName);
        
        if (!exactMatch) {
            throw new Error(`该层级不存在该模型`);
        }
        
        // 删除模型
        await this.deleteRows(this.config.sheets.models, exactMatch.rowIndex, exactMatch.rowIndex);
        
        // 删除相关的血缘关系
        const lineageData = await this.getLineageData();
        const relatedLineages = lineageData.filter(l => 
            l.sourceModelId === exactMatch.modelId || 
            l.targetModelId === exactMatch.modelId
        );
        
        // 按行号倒序删除，避免删除后行号变化的问题
        const sortedLineages = relatedLineages.sort((a, b) => b.rowIndex - a.rowIndex);
        for (const lineage of sortedLineages) {
            await this.deleteRows(this.config.sheets.lineage, lineage.rowIndex, lineage.rowIndex);
        }
        
        return { 
            success: true, 
            deletedModels: 1, 
            deletedLineages: relatedLineages.length 
        };
    }

    /**
     * 添加血缘关系
     */
    async addLineage(lineageData) {
        const { 
            sourceLevel, sourceModel, 
            targetLevel, targetModel,
            taskName, taskLocation, scheduleName, scheduleLocation, remarks, creator
        } = lineageData;
        
        // 检查来源模型是否存在
        const sourceModels = await this.findModel(sourceLevel, sourceModel);
        const exactSource = sourceModels.find(m => m.level === sourceLevel && m.modelName === sourceModel);
        
        if (!exactSource) {
            throw new Error(`${sourceLevel}-${sourceModel} 不存在，请先添加模型`);
        }
        
        // 检查目标模型是否存在
        const targetModels = await this.findModel(targetLevel, targetModel);
        const exactTarget = targetModels.find(m => m.level === targetLevel && m.modelName === targetModel);
        
        if (!exactTarget) {
            throw new Error(`${targetLevel}-${targetModel} 不存在，请先添加模型`);
        }
        
        // 检查血缘关系是否已存在
        const lineageData_list = await this.getLineageData();
        const existingLineage = lineageData_list.find(l => 
            l.sourceModelId === exactSource.modelId && 
            l.targetModelId === exactTarget.modelId
        );
        
        if (existingLineage) {
            throw new Error(`血缘关系已存在`);
        }
        
        // 生成关系ID
        const relationId = `relation_${Date.now()}`;
        const now = new Date().toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const rowData = [
            relationId,
            exactSource.modelId,
            exactTarget.modelId,
            taskName,
            taskLocation,
            scheduleName,
            scheduleLocation,
            remarks || '',
            now,
            '', // 更新时间
            creator || 'system',
            '有效' // 状态
        ];
        
        await this.appendRow(this.config.sheets.lineage, rowData);
        
        return { 
            success: true, 
            relationId,
            sourceModel: `${sourceLevel}-${sourceModel}`,
            targetModel: `${targetLevel}-${targetModel}`
        };
    }

    /**
     * 检查血缘关系是否存在（用于删除前的验证）
     */
    async checkLineage(sourceLevel, sourceModel, targetLevel, targetModel) {
        // 检查来源模型
        const sourceModels = await this.findModel(sourceLevel, sourceModel);
        const exactSource = sourceModels.find(m => m.level === sourceLevel && m.modelName === sourceModel);
        
        if (!exactSource) {
            throw new Error(`${sourceLevel}-${sourceModel}: 模型不存在`);
        }
        
        // 检查目标模型
        const targetModels = await this.findModel(targetLevel, targetModel);
        const exactTarget = targetModels.find(m => m.level === targetLevel && m.modelName === targetModel);
        
        if (!exactTarget) {
            throw new Error(`${targetLevel}-${targetModel}: 模型不存在`);
        }
        
        // 查找血缘关系
        const lineageData_list = await this.getLineageData();
        const lineage = lineageData_list.find(l => 
            l.sourceModelId === exactSource.modelId && 
            l.targetModelId === exactTarget.modelId
        );
        
        if (!lineage) {
            throw new Error(`${sourceLevel}-${sourceModel} 和 ${targetLevel}-${targetModel} 都存在，但是这两个模型之间并不存在血缘关系`);
        }
        
        return { lineage, source: exactSource, target: exactTarget };
    }

    /**
     * 删除血缘关系（执行删除操作）
     */
    async deleteLineage(sourceLevel, sourceModel, targetLevel, targetModel) {
        // 先检查
        const { lineage } = await this.checkLineage(sourceLevel, sourceModel, targetLevel, targetModel);
        
        // 删除血缘关系
        await this.deleteRows(this.config.sheets.lineage, lineage.rowIndex, lineage.rowIndex);
        
        return { success: true };
    }
}

// 创建全局实例
const feishuAPI = new FeishuAPI(FEISHU_CONFIG);
