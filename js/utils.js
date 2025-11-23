/**
 * 工具函数
 */

/**
 * 显示 Toast 提示
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * 显示模态框
 */
function showModal(title, message, onConfirm = null) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    
    modalBody.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
    `;
    
    modal.style.display = 'block';
    
    // 绑定确认事件
    modalConfirm.onclick = () => {
        modal.style.display = 'none';
        if (onConfirm) {
            onConfirm();
        }
    };
    
    // 绑定取消事件
    modalCancel.onclick = () => {
        modal.style.display = 'none';
    };
    
    // 点击关闭按钮
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // 点击模态框外部关闭
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 模糊匹配
 */
function fuzzyMatch(str, pattern) {
    if (!pattern) return true;
    const lowerStr = str.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    return lowerStr.includes(lowerPattern);
}
