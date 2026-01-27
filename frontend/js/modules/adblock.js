// AdBlock Fast Module - Custom UI with Add/Delete features
const AdBlockModule = {
    showModal: function() {
        // Fetch current config
        fetch('/cgi-bin/adblock/get')
            .then(res => res.json())
            .then(data => {
                if(data.error) {
                    Toast.show("Lỗi: " + data.error, "error");
                    return;
                }
                this.renderModal(data);
            })
            .catch(err => {
                Toast.show("Không thể tải cấu hình AdBlock.", "error");
                console.error(err);
            });
    },

    renderModal: function(data) {
        const enabled = data.enabled;
        const lists = data.lists || [];
        
        // Build list HTML with delete buttons
        let listsHtml = lists.map((list, idx) => {
            const sizeKB = Math.round(parseInt(list.size || 0) / 1024);
            const sizeDisplay = sizeKB > 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : sizeKB + ' KB';
            
            // Chống XSS: escape tên danh sách
            const safeName = window.Security ? Security.escapeHtml(list.name) : list.name;
            const escapedName = list.name.replace(/'/g, "\\'");
            const escapedUrl = list.url.replace(/'/g, "\\'");
            
            return `
                <div class="adblock-list-item" style="display:flex; align-items:center; padding:10px 12px; border-radius:8px; background:var(--card-bg, #f7fafc); margin-bottom:8px; transition: all 0.2s;">
                    <input type="checkbox" name="adblock-list" value="${list.url}" ${list.enabled ? 'checked' : ''} style="width:18px; height:18px; margin-right:12px; accent-color:#48bb78; cursor:pointer;">
                    <div style="flex:1; overflow:hidden;">
                        <div style="font-weight:600; font-size:13px; color:var(--text-primary, #2d3748); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</div>
                        <div style="font-size:11px; color:var(--text-secondary, #718096);">${sizeDisplay}</div>
                    </div>
                    <button onclick="AdBlockModule.deleteList('${escapedName}', '${escapedUrl}')" class="adblock-delete-btn" title="Xóa" style="background:none; border:none; color:#e53e3e; font-size:16px; cursor:pointer; padding:5px 8px; opacity:0.6; transition:0.2s;">🗑</button>
                </div>
            `;
        }).join('');
        
        const content = `
            <div style="text-align:left;">
                <!-- Global Toggle -->
                <div style="display:flex; align-items:center; justify-content:space-between; padding:15px; background:linear-gradient(135deg, rgba(72,187,120,0.1), rgba(56,161,105,0.15)); border-radius:12px; margin-bottom:20px;">
                    <div>
                        <div style="font-weight:700; font-size:15px; color:var(--text-primary, #2d3748);">Bật Chặn quảng cáo</div>
                        <div style="font-size:12px; color:var(--text-secondary, #718096);">AdBlock Fast</div>
                    </div>
                    <label class="adblock-switch" style="position:relative; display:inline-block; width:56px; height:30px;">
                        <input type="checkbox" id="adblock-enabled" ${enabled ? 'checked' : ''} style="opacity:0; width:0; height:0;">
                        <span class="adblock-slider" style="position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background-color:#e53e3e; transition:.3s; border-radius:30px; border:2px solid rgba(0,0,0,0.1);"></span>
                    </label>
                </div>
                
                <!-- Lists Header with Add Button -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                    <div style="font-weight:600; font-size:13px; color:var(--text-secondary, #718096);">Danh sách bộ lọc (${lists.length})</div>
                    <button id="adblock-add-btn" style="background:#3182ce; color:white; border:none; border-radius:6px; padding:5px 12px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <span style="font-size:14px;">+</span> Thêm
                    </button>
                </div>
                
                <div id="adblock-lists" style="max-height:280px; overflow-y:auto; padding-right:5px;">
                    ${listsHtml || '<div style="text-align:center; color:#999; padding:20px;">Chưa có danh sách nào.</div>'}
                </div>
                
                <!-- Save Button -->
                <button id="adblock-save-btn" style="width:100%; margin-top:20px; padding:12px; background:linear-gradient(135deg, #48bb78, #38a169); color:white; border:none; border-radius:10px; font-weight:700; font-size:14px; cursor:pointer; transition: all 0.2s;">
                    💾 Lưu cấu hình
                </button>
            </div>
            <style>
                .adblock-switch input:checked + .adblock-slider { background-color: #48bb78 !important; }
                .adblock-slider:before {
                    position: absolute;
                    content: "";
                    height: 22px;
                    width: 22px;
                    left: 4px;
                    bottom: 2px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .adblock-switch input:checked + .adblock-slider:before { transform: translateX(24px); }
                .adblock-list-item:hover { background: var(--card-hover-bg, #edf2f7) !important; }
                .adblock-list-item:hover .adblock-delete-btn { opacity: 1 !important; }
                #adblock-save-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(72,187,120,0.3); }
                #adblock-add-btn:hover { background: #2b6cb0; }
            </style>
        `;
        
        if(typeof Modal !== 'undefined') {
            Modal.show({
                title: "Chặn quảng cáo",
                content: content,
                showCancel: false,
                showIcon: false,
                confirmText: "Đóng",
                onConfirm: () => {}
            });
            
            // Adjust modal styling
            const mBox = document.querySelector('.modal-box');
            if(mBox) {
                mBox.style.maxWidth = "450px";
                mBox.style.width = "95%";
            }
            
            // Attach handlers
            setTimeout(() => {
                const saveBtn = document.getElementById('adblock-save-btn');
                if(saveBtn) {
                    saveBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.saveConfig();
                    });
                }
                
                const addBtn = document.getElementById('adblock-add-btn');
                if(addBtn) {
                    addBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showAddModal();
                    });
                }
            }, 100);
        }
    },
    
    showAddModal: function() {
        const addContent = `
            <div style="text-align:left;">
                <div style="margin-bottom:15px;">
                    <label style="display:block; font-weight:600; font-size:13px; color:var(--text-secondary, #718096); margin-bottom:6px;">Tên danh sách</label>
                    <input type="text" id="adblock-new-name" placeholder="VD: My Custom List" style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; box-sizing:border-box;">
                </div>
                <div style="margin-bottom:20px;">
                    <label style="display:block; font-weight:600; font-size:13px; color:var(--text-secondary, #718096); margin-bottom:6px;">URL danh sách</label>
                    <input type="text" id="adblock-new-url" placeholder="https://example.com/blocklist.txt" style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:14px; box-sizing:border-box;">
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="adblock-add-cancel" style="flex:1; padding:12px; background:#e2e8f0; color:#4a5568; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Hủy</button>
                    <button id="adblock-add-confirm" style="flex:1; padding:12px; background:#3182ce; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Thêm</button>
                </div>
            </div>
        `;
        
        // Create a sub-modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'adblock-add-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:99999;';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--card-bg, white); border-radius:16px; padding:24px; max-width:400px; width:90%; box-shadow:0 20px 40px rgba(0,0,0,0.3); animation: popIn 0.2s ease-out;';
        box.innerHTML = `<style>@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style><h3 style="margin:0 0 20px 0; font-size:18px; color:var(--text-primary, #2d3748);">Thêm danh sách mới</h3>${addContent}`;
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // Close when clicking overlay background (not the box)
        overlay.addEventListener('click', (e) => {
            if(e.target === overlay) {
                overlay.remove();
            }
        });
        
        // Prevent box clicks from bubbling to overlay
        box.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Attach handlers
        document.getElementById('adblock-add-cancel').addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.remove();
        });
        
        document.getElementById('adblock-add-confirm').addEventListener('click', (e) => {
            e.stopPropagation();
            const name = document.getElementById('adblock-new-name').value.trim();
            const url = document.getElementById('adblock-new-url').value.trim();
            
            if(!name || !url) {
                Toast.show("Vui lòng nhập đầy đủ thông tin.", "error");
                return;
            }
            
            this.addList(name, url, overlay);
        });
    },
    
    addList: function(name, url, overlay) {
        const confirmBtn = document.getElementById('adblock-add-confirm');
        if(confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '⏳ Đang thêm...';
        }
        
        fetch('/cgi-bin/adblock/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, url: url })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                Toast.show("Đã thêm danh sách mới!", "success");
                overlay.remove();
                Modal.close();
                this.showModal(); // Refresh the main modal
            } else {
                Toast.show("Lỗi: " + (data.error || "Không thể thêm."), "error");
            }
        })
        .catch(err => {
            Toast.show("Lỗi kết nối API.", "error");
            console.error(err);
        })
        .finally(() => {
            if(confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Thêm';
            }
        });
    },
    
    deleteList: function(name, url) {
        // Create custom confirm modal instead of native confirm()
        const overlay = document.createElement('div');
        overlay.id = 'adblock-delete-overlay';
        overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:99999;';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--card-bg, white); border-radius:16px; padding:24px; max-width:350px; width:90%; box-shadow:0 20px 40px rgba(0,0,0,0.3); text-align:center; animation: popIn 0.2s ease-out;';
        box.innerHTML = `
            <style>@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }</style>
            <div style="font-size:40px; margin-bottom:15px;">⚠️</div>
            <h3 style="margin:0 0 10px 0; font-size:16px; color:var(--text-primary, #2d3748);">Xác nhận xóa</h3>
            <p style="color:var(--text-secondary, #718096); font-size:14px; margin-bottom:20px;">Bạn có chắc muốn xóa danh sách<br><strong>"${name}"</strong>?</p>
            <div style="display:flex; gap:10px;">
                <button id="adblock-delete-cancel" style="flex:1; padding:12px; background:#e2e8f0; color:#4a5568; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Hủy</button>
                <button id="adblock-delete-confirm" style="flex:1; padding:12px; background:#e53e3e; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">Xóa</button>
            </div>
        `;
        
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        document.getElementById('adblock-delete-cancel').addEventListener('click', () => {
            overlay.remove();
        });
        
        document.getElementById('adblock-delete-confirm').addEventListener('click', () => {
            const confirmBtn = document.getElementById('adblock-delete-confirm');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '⏳ Đang xóa...';
            
            fetch('/cgi-bin/adblock/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            })
            .then(res => res.json())
            .then(data => {
                overlay.remove();
                if(data.success) {
                    Toast.show("Đã xóa danh sách!", "success");
                    Modal.close();
                    this.showModal(); // Refresh the modal
                } else {
                    Toast.show("Lỗi: " + (data.error || "Không thể xóa."), "error");
                }
            })
            .catch(err => {
                overlay.remove();
                Toast.show("Lỗi kết nối API.", "error");
                console.error(err);
            });
        });
    },
    
    saveConfig: function() {
        const enabledCheckbox = document.getElementById('adblock-enabled');
        const listCheckboxes = document.querySelectorAll('input[name="adblock-list"]:checked');
        
        const enabled = enabledCheckbox ? enabledCheckbox.checked : false;
        const lists = Array.from(listCheckboxes).map(cb => cb.value);
        
        const saveBtn = document.getElementById('adblock-save-btn');
        if(saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '⏳ Đang lưu...';
        }
        
        fetch('/cgi-bin/adblock/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: enabled, lists: lists })
        })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                Toast.show("Đã lưu cấu hình AdBlock!", "success");
                // Modal.close(); // Keep open for better UX
            } else {
                Toast.show("Lỗi: " + (data.error || "Không thể lưu."), "error");
            }
        })
        .catch(err => {
            Toast.show("Lỗi kết nối API.", "error");
            console.error(err);
        })
        .finally(() => {
            if(saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '💾 Lưu cấu hình';
            }
        });
    }
};

window.AdBlockModule = AdBlockModule;
