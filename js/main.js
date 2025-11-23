/**
 * 主逻辑文件
 */

// 全局变量
let configData = { levels: [], subjects: [] };
let modelsData = [];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 检查是否在飞书环境中
        const isInFeishu = typeof window.h5sdk !== 'undefined' || 
                          typeof window.tt !== 'undefined' ||
                          window.location.href.includes('feishu.cn') ||
                          window.location.href.includes('larkoffice.com') ||
                          document.referer.includes('feishu.cn') ||
                          document.referer.includes('larkoffice.com');
        
        // 调试信息
        console.log('环境检测:', {
            h5sdk: typeof window.h5sdk !== 'undefined',
            tt: typeof window.tt !== 'undefined',
            location: window.location.href,
            referer: document.referer,
            userAgent: navigator.userAgent,
            isInFeishu: isInFeishu
        });
        
        if (isInFeishu) {
            await initFeishuSDK();
            document.getElementById('authBtn').textContent = '已授权';
            document.querySelector('.status-text').textContent = '已授权';
        } else {
            // 不在飞书环境中，但仍然可以调用 API（使用 tenant_access_token）
            // 只是提示用户建议在飞书环境中使用
            document.getElementById('authBtn').textContent = '请使用飞书打开';
            document.querySelector('.status-text').textContent = '未授权（建议在飞书客户端中使用）';
        }
        
        // 初始化标签页切换
        initTabs();
        
        // 初始化表单
        initForms();
        
        // 加载配置数据（无论是否在飞书环境中，都可以调用 API）
        try {
            await loadConfigData();
            // 如果加载成功，更新授权状态
            if (isInFeishu) {
                document.getElementById('authBtn').textContent = '已授权';
                document.querySelector('.status-text').textContent = '已授权';
            } else {
                document.getElementById('authBtn').textContent = '已连接';
                document.querySelector('.status-text').textContent = '已连接';
            }
        } catch (error) {
            console.error('加载配置数据失败:', error);
            console.error('完整错误信息:', error);
            // 显示更友好的错误信息
            const errorMessage = error.message || '未知错误';
            showToast('加载配置数据失败: ' + errorMessage, 'error');
        }
        
        // 加载模型数据（用于自动完成）
        try {
            await loadModelsData();
        } catch (error) {
            console.error('加载模型数据失败:', error);
            // 不显示错误提示，因为这不是关键功能
        }
        
    } catch (error) {
        console.error('初始化错误:', error);
        showToast('初始化失败: ' + error.message, 'error');
    }
});

/**
 * 初始化飞书 SDK
 */
async function initFeishuSDK() {
    try {
        // 飞书 SDK 已在 HTML 中引入
        // 获取访问令牌等操作在 API 调用时进行
        showToast('飞书 SDK 已初始化', 'success');
    } catch (error) {
        console.error('飞书 SDK 初始化错误:', error);
        throw error;
    }
}

/**
 * 初始化标签页切换
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // 移除所有活动状态
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // 添加活动状态
            btn.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // 清空表单和结果
            clearForms();
        });
    });
}

/**
 * 加载配置数据
 */
async function loadConfigData() {
    try {
        configData = await feishuAPI.getConfigData();
        
        // 填充层级下拉框
        const levelSelects = document.querySelectorAll('[id$="Level"]');
        levelSelects.forEach(select => {
            // 清空选项（保留第一个占位符）
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            // 添加层级选项
            configData.levels.forEach(level => {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = level;
                select.appendChild(option);
            });
        });
        
        // 填充主题域下拉框
        const subjectSelects = document.querySelectorAll('[id$="Subject"]');
        subjectSelects.forEach(select => {
            while (select.options.length > 1) {
                select.remove(1);
            }
            
            configData.subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                select.appendChild(option);
            });
        });
        
    } catch (error) {
        console.error('加载配置数据错误:', error);
        showToast('加载配置数据失败: ' + error.message, 'error');
    }
}

/**
 * 加载模型数据
 */
async function loadModelsData() {
    try {
        modelsData = await feishuAPI.getModelsData();
    } catch (error) {
        console.error('加载模型数据错误:', error);
        // 不显示错误提示，因为可能在初始化时还未授权
    }
}

/**
 * 初始化表单
 */
function initForms() {
    // 查询模型表单
    const queryForm = document.getElementById('queryForm');
    queryForm.addEventListener('submit', handleQueryModel);
    
    // 添加模型表单
    const addModelForm = document.getElementById('addModelForm');
    addModelForm.addEventListener('submit', handleAddModel);
    
    // 删除模型表单
    const deleteModelForm = document.getElementById('deleteModelForm');
    deleteModelForm.addEventListener('submit', handleDeleteModel);
    
    // 添加血缘关系表单
    const addLineageForm = document.getElementById('addLineageForm');
    addLineageForm.addEventListener('submit', handleAddLineage);
    
    // 删除血缘关系表单
    const deleteLineageForm = document.getElementById('deleteLineageForm');
    deleteLineageForm.addEventListener('submit', handleDeleteLineage);
    
    // 初始化自动完成
    initAutocomplete();
}

/**
 * 初始化自动完成功能
 */
function initAutocomplete() {
    // 删除模型名称自动完成
    setupAutocomplete('deleteModelName', 'deleteModelSuggestions', async (value, level) => {
        if (!value || !level) return [];
        const matches = await feishuAPI.findModel(level, value);
        return matches.map(m => `${m.modelName} (${m.modelComment})`);
    }, () => {
        const level = document.getElementById('deleteModelLevel').value;
        return { level };
    });
    
    // 来源模型自动完成
    setupAutocomplete('sourceModel', 'sourceModelSuggestions', async (value, level) => {
        if (!value || !level) return [];
        const matches = await feishuAPI.findModel(level, value);
        return matches.map(m => ({
            text: `${m.modelName} (${m.modelComment})`,
            data: m
        }));
    }, () => {
        const level = document.getElementById('sourceLevel').value;
        return { level };
    }, (model) => {
        // 选择模型后填充相关信息
        document.getElementById('sourceSubject').value = model.subject || '';
        document.getElementById('sourceComment').value = model.modelComment || '';
    });
    
    // 目标模型自动完成
    setupAutocomplete('targetModel', 'targetModelSuggestions', async (value, level) => {
        if (!value || !level) return [];
        const matches = await feishuAPI.findModel(level, value);
        return matches.map(m => ({
            text: `${m.modelName} (${m.modelComment})`,
            data: m
        }));
    }, () => {
        const level = document.getElementById('targetLevel').value;
        return { level };
    }, (model) => {
        document.getElementById('targetSubject').value = model.subject || '';
        document.getElementById('targetComment').value = model.modelComment || '';
    });
    
    // 删除血缘关系表单的自动完成
    setupAutocomplete('deleteSourceModel', 'deleteSourceSuggestions', async (value, level) => {
        if (!value || !level) return [];
        const matches = await feishuAPI.findModel(level, value);
        return matches.map(m => m.modelName);
    }, () => {
        const level = document.getElementById('deleteSourceLevel').value;
        return { level };
    });
    
    setupAutocomplete('deleteTargetModel', 'deleteTargetSuggestions', async (value, level) => {
        if (!value || !level) return [];
        const matches = await feishuAPI.findModel(level, value);
        return matches.map(m => m.modelName);
    }, () => {
        const level = document.getElementById('deleteTargetLevel').value;
        return { level };
    });
}

/**
 * 设置自动完成
 */
function setupAutocomplete(inputId, suggestionsId, fetchFn, getParamsFn, onSelectFn) {
    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);
    
    if (!input || !suggestions) return;
    
    let selectedIndex = -1;
    
    const debouncedSearch = debounce(async () => {
        const value = input.value.trim();
        const params = getParamsFn ? getParamsFn() : {};
        
        if (!value) {
            suggestions.classList.remove('show');
            return;
        }
        
        try {
            const results = await fetchFn(value, params.level || params);
            
            if (Array.isArray(results) && results.length > 0) {
                suggestions.innerHTML = '';
                
                results.forEach((result, index) => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    
                    if (typeof result === 'object' && result.text) {
                        item.textContent = result.text;
                        item.onclick = () => {
                            input.value = result.data.modelName;
                            suggestions.classList.remove('show');
                            if (onSelectFn) {
                                onSelectFn(result.data);
                            }
                        };
                    } else {
                        item.textContent = result;
                        item.onclick = () => {
                            input.value = result;
                            suggestions.classList.remove('show');
                        };
                    }
                    
                    suggestions.appendChild(item);
                });
                
                suggestions.classList.add('show');
            } else {
                suggestions.classList.remove('show');
            }
        } catch (error) {
            console.error('自动完成错误:', error);
            suggestions.classList.remove('show');
        }
    }, 300);
    
    input.addEventListener('input', debouncedSearch);
    input.addEventListener('blur', () => {
        // 延迟隐藏，以便点击选项
        setTimeout(() => {
            suggestions.classList.remove('show');
        }, 200);
    });
    
    input.addEventListener('focus', () => {
        if (input.value.trim()) {
            debouncedSearch();
        }
    });
}

/**
 * 处理查询模型
 */
async function handleQueryModel(e) {
    e.preventDefault();
    
    const level = document.getElementById('queryLevel').value;
    const modelName = document.getElementById('queryModelName').value.trim();
    
    if (!level || !modelName) {
        showToast('请填写完整信息', 'error');
        return;
    }
    
    try {
        const results = await feishuAPI.findModel(level, modelName);
        displayQueryResults(results);
    } catch (error) {
        showToast('查询失败: ' + error.message, 'error');
    }
}

/**
 * 显示查询结果
 */
function displayQueryResults(results) {
    const container = document.getElementById('queryResults');
    
    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">未找到匹配的模型</div>';
        return;
    }
    
    let html = '<table class="results-table"><thead><tr>';
    html += '<th>模型ID</th>';
    html += '<th>模型名称</th>';
    html += '<th>模型注释</th>';
    html += '<th>层级</th>';
    html += '<th>主题域</th>';
    html += '<th>创建时间</th>';
    html += '<th>创建人</th>';
    html += '<th>状态</th>';
    html += '</tr></thead><tbody>';
    
    results.forEach(model => {
        html += '<tr>';
        html += `<td>${model.modelId || ''}</td>`;
        html += `<td>${model.modelName || ''}</td>`;
        html += `<td>${model.modelComment || ''}</td>`;
        html += `<td>${model.level || ''}</td>`;
        html += `<td>${model.subject || ''}</td>`;
        html += `<td>${model.createTime || ''}</td>`;
        html += `<td>${model.creator || ''}</td>`;
        html += `<td>${model.status || ''}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * 处理添加模型
 */
async function handleAddModel(e) {
    e.preventDefault();
    
    const modelName = document.getElementById('addModelName').value.trim();
    const level = document.getElementById('addModelLevel').value;
    const modelComment = document.getElementById('addModelComment').value.trim();
    const subject = document.getElementById('addModelSubject').value;
    
    if (!modelName || !level || !modelComment || !subject) {
        showToast('请填写所有必填项', 'error');
        return;
    }
    
    try {
        await feishuAPI.addModel({
            modelName,
            level,
            modelComment,
            subject
        });
        
        showToast(`模型 ${level}-${modelName} 添加成功`, 'success');
        
        // 清空表单
        document.getElementById('addModelForm').reset();
        
        // 重新加载模型数据
        await loadModelsData();
        
    } catch (error) {
        if (error.message.includes('已经存在')) {
            showModal('添加失败', error.message, null);
        } else {
            showToast('添加失败: ' + error.message, 'error');
        }
    }
}

/**
 * 处理删除模型
 */
async function handleDeleteModel(e) {
    e.preventDefault();
    
    const level = document.getElementById('deleteModelLevel').value;
    const modelName = document.getElementById('deleteModelName').value.trim();
    
    if (!level || !modelName) {
        showToast('请填写完整信息', 'error');
        return;
    }
    
    try {
        // 先查找模型，获取详细信息用于确认
        const models = await feishuAPI.findModel(level, modelName);
        const exactMatch = models.find(m => m.level === level && m.modelName === modelName);
        
        if (!exactMatch) {
            showModal('删除失败', `该层级不存在该模型`, null);
            return;
        }
        
        // 二次确认
        const confirmMessage = `是否确认删除该模型？<br><br>` +
            `层级: ${exactMatch.level}<br>` +
            `模型名称: ${exactMatch.modelName}<br>` +
            `模型注释: ${exactMatch.modelComment || ''}<br>` +
            `模型主题域: ${exactMatch.subject || ''}`;
        
        showModal('确认删除', confirmMessage, async () => {
            try {
                await feishuAPI.deleteModel(level, modelName);
                showToast(`模型 ${level}-${modelName} 删除成功`, 'success');
                
                // 清空表单
                document.getElementById('deleteModelForm').reset();
                
                // 重新加载模型数据
                await loadModelsData();
            } catch (error) {
                showToast('删除失败: ' + error.message, 'error');
            }
        });
        
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

/**
 * 处理添加血缘关系
 */
async function handleAddLineage(e) {
    e.preventDefault();
    
    const sourceLevel = document.getElementById('sourceLevel').value;
    const sourceModel = document.getElementById('sourceModel').value.trim();
    const targetLevel = document.getElementById('targetLevel').value;
    const targetModel = document.getElementById('targetModel').value.trim();
    const taskName = document.getElementById('taskName').value.trim();
    const taskLocation = document.getElementById('taskLocation').value.trim();
    const scheduleName = document.getElementById('scheduleName').value.trim();
    const scheduleLocation = document.getElementById('scheduleLocation').value.trim();
    const remarks = document.getElementById('remarks').value.trim();
    
    if (!sourceLevel || !sourceModel || !targetLevel || !targetModel || 
        !taskName || !taskLocation || !scheduleName || !scheduleLocation) {
        showToast('请填写所有必填项', 'error');
        return;
    }
    
    try {
        const result = await feishuAPI.addLineage({
            sourceLevel,
            sourceModel,
            targetLevel,
            targetModel,
            taskName,
            taskLocation,
            scheduleName,
            scheduleLocation,
            remarks
        });
        
        showToast(`${result.sourceModel} -> ${result.targetModel} 血缘关系添加成功`, 'success');
        
        // 清空表单
        document.getElementById('addLineageForm').reset();
        
    } catch (error) {
        if (error.message.includes('不存在') || error.message.includes('已存在')) {
            showModal('添加失败', error.message, null);
        } else {
            showToast('添加失败: ' + error.message, 'error');
        }
    }
}

/**
 * 处理删除血缘关系
 */
async function handleDeleteLineage(e) {
    e.preventDefault();
    
    const sourceLevel = document.getElementById('deleteSourceLevel').value;
    const sourceModel = document.getElementById('deleteSourceModel').value.trim();
    const targetLevel = document.getElementById('deleteTargetLevel').value;
    const targetModel = document.getElementById('deleteTargetModel').value.trim();
    
    if (!sourceLevel || !sourceModel || !targetLevel || !targetModel) {
        showToast('请填写完整信息', 'error');
        return;
    }
    
    try {
        // 先检查模型和关系是否存在（只检查，不删除）
        await feishuAPI.checkLineage(sourceLevel, sourceModel, targetLevel, targetModel);
        
        // 如果检查通过，进行二次确认
        const confirmMessage = `是否确认删除该血缘关系？<br><br>` +
            `来源: ${sourceLevel}-${sourceModel}<br>` +
            `目标: ${targetLevel}-${targetModel}`;
        
        showModal('确认删除', confirmMessage, async () => {
            try {
                // 确认后执行删除
                await feishuAPI.deleteLineage(sourceLevel, sourceModel, targetLevel, targetModel);
                showToast(`血缘关系 ${sourceLevel}-${sourceModel} -> ${targetLevel}-${targetModel} 删除成功`, 'success');
                
                // 清空表单
                document.getElementById('deleteLineageForm').reset();
            } catch (error) {
                showToast('删除失败: ' + error.message, 'error');
            }
        });
        
    } catch (error) {
        // 检查失败，显示错误信息
        if (error.message.includes('不存在')) {
            showModal('删除失败', error.message, null);
        } else {
            showToast('检查失败: ' + error.message, 'error');
        }
    }
}

/**
 * 清空所有表单
 */
function clearForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.reset());
    
    const results = document.getElementById('queryResults');
    if (results) {
        results.innerHTML = '';
    }
    
    // 清空自动完成
    const suggestions = document.querySelectorAll('.autocomplete-suggestions');
    suggestions.forEach(s => s.classList.remove('show'));
}
