// AdBlock Fast Module - Custom UI with Add/Delete features
const AdBlockModule = {
    showModal: function () {
        // Fetch current config
        fetch("/cgi-bin/adblock/get")
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    Toast.show("Lỗi: " + data.error, "error");
                    return;
                }
                this.renderModal(data);
            })
            .catch((err) => {
                Toast.show("Không thể tải cấu hình AdBlock.", "error");
                console.error(err);
            });
    },

    renderModal: function (data) {
        const enabled = data.enabled;
        const lists = data.lists || [];
        const status = data.status || {};

        let listsHtml = lists
            .map((list) => {
                const sizeKB = Math.round(parseInt(list.size || 0) / 1024);
                const sizeDisplay =
                    sizeKB > 1024
                        ? (sizeKB / 1024).toFixed(1) + " MB"
                        : sizeKB + " KB";
                const safeName = window.Security
                    ? Security.escapeHtml(list.name)
                    : list.name;
                const escapedName = list.name.replace(/'/g, "\\'");
                const escapedUrl = list.url.replace(/'/g, "\\'");

                return `
                <div class="adblock-list-row" style="display:flex; align-items:center; padding:12px; border-radius:12px; background:var(--bg-card); border:1px solid var(--border-color); margin-bottom:10px; transition:0.2s;">
                    <div style="margin-right:12px; display:flex; align-items:center;">
                        <label class="custom-checkbox">
                            <input type="checkbox" name="adblock-list" value="${list.url}" ${list.enabled ? "checked" : ""}>
                            <span class="checkmark"></span>
                        </label>
                    </div>
                    <div style="flex:1; overflow:hidden;">
                        <div style="font-weight:700; font-size:13px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</div>
                        <div style="font-size:11px; color:var(--text-sub); opacity:0.7;">${sizeDisplay}</div>
                    </div>
                    <button onclick="AdBlockModule.deleteList('${escapedName}', '${escapedUrl}')" class="adblock-item-del" title="Xóa">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            })
            .join("");

        const content = `
            <div class="adblock-modern-container">
                
                <!-- Status Row -->
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:15px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow);">
                    <div>
                        <div style="font-size:11px; color:var(--text-sub); opacity:0.8; font-weight:700;">VERSION ${status.version || "1.2.x"}</div>
                        <div style="font-size:16px; font-weight:800; color:var(--text-main);">${enabled ? "ĐANG HOẠT ĐỘNG" : "ĐANG TẮT"}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:18px; font-weight:900; color:var(--ad-accent, #6366f1);">${(parseInt(status.blocked_domains || 0) / 1000).toFixed(1)}k</div>
                        <div style="font-size:10px; color:var(--text-sub); font-weight:700; text-transform:uppercase;">DOMAINS</div>
                    </div>
                </div>

                <!-- Toggle Row -->
                <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:16px; padding:12px 15px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow);">
                    <span style="font-weight:700; font-size:14px; color:var(--text-main);">Bật chặn quảng cáo</span>
                    <label class="modern-switch">
                        <input type="checkbox" id="adblock-enabled" ${enabled ? "checked" : ""}>
                        <span class="modern-slider"></span>
                    </label>
                </div>

                <!-- Filter Header -->
                <div style="display:flex; align-items:center; justify-content:space-between; margin:0 0 10px 0; padding:0 5px;">
                    <div style="font-size:11px; font-weight:800; color:var(--text-sub); opacity:0.8; letter-spacing:1px; text-transform:uppercase;">BỘ LỌC (${lists.length})</div>
                    <button id="adblock-add-btn" class="modern-action-btn">+ Thêm mới</button>
                </div>

                <div id="adblock-lists" class="modern-scrollable-list">
                    ${listsHtml || '<div style="text-align:center; color:var(--text-sub); opacity:0.5; padding:30px;">Chưa có dữ liệu.</div>'}
                </div>

                <!-- Save Action -->
                <button id="adblock-save-btn" class="modern-save-button">Lưu cấu hình</button>
            </div>

            <style>
                :root {
                    --ad-accent: #6366f1;
                    --ad-success: #10b981;
                }
                .adblock-modern-container { color: var(--text-main); }
                /* HIDE DEFAULT MODAL CLOSE BUTTON - the one with &times; character */
                .modal-box > button:first-child { display: none !important; }
                
                .modern-action-btn { background: var(--ad-accent); color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; }
                .modern-scrollable-list { max-height: 230px; overflow-y: auto; padding-right: 5px; }
                .modern-scrollable-list::-webkit-scrollbar { width: 4px; }
                .modern-scrollable-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
                .adblock-item-del { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0.4; transition: 0.2s; }
                .adblock-list-row:hover .adblock-item-del { opacity: 1; }
                .modern-save-button { width: 100%; margin-top: 15px; padding: 12px; background: var(--ad-accent); color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; transition: 0.2s; }
                .modern-save-button:hover { opacity: 0.9; transform: translateY(-1px); }

                /* Custom Checkbox */
                .custom-checkbox { position: relative; display: block; width: 20px; height: 20px; cursor: pointer; }
                .custom-checkbox input { position: absolute; opacity: 0; width:0; height:0; }
                .checkmark { position: absolute; top:0; left:0; height: 20px; width: 20px; background-color: var(--bg-card); border: 2px solid var(--border-color); border-radius: 6px; }
                .custom-checkbox input:checked ~ .checkmark { background-color: var(--ad-success); border-color: var(--ad-success); }
                .checkmark:after { content: ""; position: absolute; display: none; left: 5px; top: 1px; width: 5px; height: 10px; border: solid white; border-width: 0 3px 3px 0; transform: rotate(45deg); }
                .custom-checkbox input:checked ~ .checkmark:after { display: block; }

                /* Modern Switch */
                .modern-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .modern-switch input { opacity: 0; width: 0; height: 0; }
                .modern-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border-color); transition: .4s; border-radius: 34px; }
                .modern-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
                .modern-switch input:checked + .modern-slider { background-color: var(--ad-success); }
                .modern-switch input:checked + .modern-slider:before { transform: translateX(20px); }
            </style>
        `;

        if (typeof Modal !== "undefined") {
            const modalId = Modal.show({
                title: "Chặn quảng cáo",
                content: content,
                showCancel: false,
                showIcon: false,
                onConfirm: null,
            });

            // Hardened UI adjustments (Runs after a short delay to ensure DOM and CSS are ready)
            setTimeout(() => {
                const overlay = document.getElementById(modalId);
                if (!overlay) return;

                const box = overlay.querySelector(".modal-box");
                if (box) {
                    // Force box styling to match the modern theme
                    Object.assign(box.style, {
                        position: "relative",
                        background: "var(--bg-card)",
                        borderRadius: "24px",
                        padding: "45px 25px 25px 25px", // Increased top padding to give X button its own space
                        border: "1px solid var(--border-color)",
                        boxShadow: "var(--shadow)",
                        color: "var(--text-main)",
                        maxWidth: "440px",
                        width: "95%",
                        overflow: "visible",
                    });

                    // 1. Hide the old ugly close button
                    const oldBtn = box.querySelector("button");
                    if (oldBtn && oldBtn.innerText.includes("×")) {
                        oldBtn.style.setProperty(
                            "display",
                            "none",
                            "important",
                        );
                    }

                    // 2. Hide title and actions if they exist
                    const h3 = box.querySelector("h3");
                    if (h3) h3.style.display = "none";
                    const actions = box.querySelector(".modal-actions");
                    if (actions) actions.style.display = "none";

                    // 3. Create a beautiful NEW close button
                    const closeBtn = document.createElement("div");
                    closeBtn.innerHTML =
                        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>';
                    Object.assign(closeBtn.style, {
                        position: "absolute",
                        top: "12px",
                        right: "12px",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        color: "var(--text-sub)",
                        borderRadius: "50%",
                        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                        zIndex: "99999",
                        background: "transparent",
                    });

                    closeBtn.onmouseenter = () => {
                        closeBtn.style.background = "var(--border-color)";
                        closeBtn.style.color = "var(--text-main)";
                        closeBtn.style.transform = "rotate(90deg) scale(1.1)";
                    };
                    closeBtn.onmouseleave = () => {
                        closeBtn.style.background = "transparent";
                        closeBtn.style.color = "var(--text-sub)";
                        closeBtn.style.transform = "rotate(0deg) scale(1)";
                    };
                    closeBtn.onclick = () => overlay.remove();

                    box.appendChild(closeBtn);
                }
            }, 100);

            // Attach app logic handlers
            setTimeout(() => {
                const saveBtn = document.getElementById("adblock-save-btn");
                if (saveBtn) {
                    saveBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.saveConfig();
                    });
                }

                const addBtn = document.getElementById("adblock-add-btn");
                if (addBtn) {
                    addBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.showAddModal();
                    });
                }
            }, 100);
        }
    },

    showAddModal: function () {
        const overlay = document.createElement("div");
        overlay.id = "adblock-add-overlay";
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999;
            opacity: 0; transition: opacity 0.3s ease;
        `;

        const box = document.createElement("div");
        box.style.cssText = `
            background: var(--bg-card, #ffffff);
            border-radius: 24px;
            padding: 30px;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color, #e2e8f0);
            color: var(--text-main, #2d3748);
            position: relative;
            transform: scale(0.9);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;

        box.innerHTML = `
            <h3 style="margin: 0 0 25px 0; font-size: 20px; font-weight: 800; text-align: center; background: linear-gradient(135deg, var(--accent-color), #63b3ed); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Thêm danh sách mới</h3>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; font-weight: 700; font-size: 11px; color: var(--text-sub); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Tên danh sách</label>
                <input type="text" id="adblock-new-name" class="premium-input" placeholder="VD: Hagezi Pro" autocomplete="off">
            </div>
            
            <div style="margin-bottom: 30px;">
                <label style="display: block; font-weight: 700; font-size: 11px; color: var(--text-sub); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">URL danh sách</label>
                <input type="text" id="adblock-new-url" class="premium-input" placeholder="https://example.com/list.txt" autocomplete="off">
            </div>

            <div style="display: flex; gap: 15px;">
                <button id="adblock-add-cancel" class="premium-btn btn-secondary">Hủy bỏ</button>
                <button id="adblock-add-confirm" class="premium-btn btn-primary">Thêm ngay</button>
            </div>

            <style>
                .premium-input {
                    width: 100%; padding: 14px 16px;
                    background: var(--bg-body, #f7fafc);
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 12px;
                    color: var(--text-main);
                    font-size: 14px;
                    outline: none; transition: all 0.3s ease;
                }
                .premium-input:focus {
                    border-color: var(--accent-color);
                    background: var(--bg-card);
                    box-shadow: 0 0 0 4px rgba(66, 153, 225, 0.15);
                }
                .premium-btn {
                    flex: 1; padding: 14px;
                    border: none; border-radius: 12px;
                    font-weight: 700; font-size: 15px;
                    cursor: pointer; transition: all 0.3s ease;
                    display: flex; align-items: center; justify-content: center;
                }
                .btn-secondary {
                    background: var(--bg-body, #edf2f7);
                    color: var(--text-sub, #718096);
                }
                .btn-secondary:hover {
                    background: var(--border-color);
                    color: var(--text-main);
                }
                .btn-primary {
                    background: var(--accent-color, #3182ce);
                    color: white;
                    box-shadow: 0 8px 20px rgba(49, 130, 206, 0.3);
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px rgba(49, 130, 206, 0.4);
                    filter: brightness(1.1);
                }
                .btn-primary:active { transform: translateY(0); }
            </style>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Entrance animation
        requestAnimationFrame(() => {
            overlay.style.opacity = "1";
            box.style.transform = "scale(1)";
        });

        const closeFunc = () => {
            overlay.style.opacity = "0";
            box.style.transform = "scale(0.9)";
            setTimeout(() => overlay.remove(), 300);
        };

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeFunc();
        });

        box.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        document.getElementById("adblock-add-cancel").addEventListener("click", (e) => {
            e.stopPropagation();
            closeFunc();
        });

        document.getElementById("adblock-add-confirm").addEventListener("click", (e) => {
            e.stopPropagation();
                const name = document
                    .getElementById("adblock-new-name")
                    .value.trim();
                const url = document
                    .getElementById("adblock-new-url")
                    .value.trim();

                if (!name || !url) {
                    Toast.show("Vui lòng nhập đầy đủ thông tin.", "error");
                    return;
                }

                this.addList(name, url, overlay);
            });
    },

    addList: function (name, url, overlay) {
        const confirmBtn = document.getElementById("adblock-add-confirm");
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = "⏳ Đang thêm...";
        }

        // Prepare Payload with CSRF
        const payload = { name: name, url: url };
        const headers = { "Content-Type": "application/json" };

        if (typeof VWRT_API !== "undefined" && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers["X-CSRF-Token"] = VWRT_API.csrfToken;
        }

        fetch("/cgi-bin/adblock/add", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    Toast.show("Đã thêm danh sách mới!", "success");
                    overlay.remove();
                    Modal.close();
                    this.showModal(); // Refresh the main modal
                } else {
                    Toast.show(
                        "Lỗi: " + (data.error || "Không thể thêm."),
                        "error",
                    );
                }
            })
            .catch((err) => {
                Toast.show("Lỗi kết nối API.", "error");
                console.error(err);
            })
            .finally(() => {
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = "Thêm";
                }
            });
    },

    deleteList: function (name, url) {
        // Create custom confirm modal instead of native confirm()
        const overlay = document.createElement("div");
        overlay.id = "adblock-delete-overlay";
        overlay.style.cssText =
            "position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:99999;";

        const box = document.createElement("div");
        box.style.cssText =
            "background:var(--card-bg, white); border-radius:16px; padding:24px; max-width:350px; width:90%; box-shadow:0 20px 40px rgba(0,0,0,0.3); text-align:center; animation: popIn 0.2s ease-out;";
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

        document
            .getElementById("adblock-delete-cancel")
            .addEventListener("click", () => {
                overlay.remove();
            });

        document
            .getElementById("adblock-delete-confirm")
            .addEventListener("click", () => {
                const confirmBtn = document.getElementById(
                    "adblock-delete-confirm",
                );
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = "⏳ Đang xóa...";

                // Prepare Payload with CSRF
                const payload = { url: url };
                const headers = { "Content-Type": "application/json" };

                if (typeof VWRT_API !== "undefined" && VWRT_API.csrfToken) {
                    payload.csrf_token = VWRT_API.csrfToken;
                    headers["X-CSRF-Token"] = VWRT_API.csrfToken;
                }

                fetch("/cgi-bin/adblock/delete", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(payload),
                })
                    .then((res) => res.json())
                    .then((data) => {
                        overlay.remove();
                        if (data.success) {
                            Toast.show("Đã xóa danh sách!", "success");
                            Modal.close();
                            this.showModal(); // Refresh the modal
                        } else {
                            Toast.show(
                                "Lỗi: " + (data.error || "Không thể xóa."),
                                "error",
                            );
                        }
                    })
                    .catch((err) => {
                        overlay.remove();
                        Toast.show("Lỗi kết nối API.", "error");
                        console.error(err);
                    });
            });
    },

    saveConfig: function () {
        const enabledCheckbox = document.getElementById("adblock-enabled");
        const listCheckboxes = document.querySelectorAll(
            'input[name="adblock-list"]:checked',
        );

        const enabled = enabledCheckbox ? enabledCheckbox.checked : false;
        const lists = Array.from(listCheckboxes).map((cb) => cb.value);

        const saveBtn = document.getElementById("adblock-save-btn");
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = "⏳ Đang lưu...";
        }

        // Prepare CSRF
        const payload = { enabled: enabled, lists: lists };
        const headers = { "Content-Type": "application/json" };

        if (typeof VWRT_API !== "undefined" && VWRT_API.csrfToken) {
            payload.csrf_token = VWRT_API.csrfToken;
            headers["X-CSRF-Token"] = VWRT_API.csrfToken;
        }

        fetch("/cgi-bin/adblock/set", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    Toast.show("Đã lưu cấu hình AdBlock!", "success");
                    // Modal.close(); // Keep open for better UX
                } else {
                    Toast.show(
                        "Lỗi: " + (data.error || "Không thể lưu."),
                        "error",
                    );
                }
            })
            .catch((err) => {
                Toast.show("Lỗi kết nối API.", "error");
                console.error(err);
            })
            .finally(() => {
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = "💾 Lưu cấu hình";
                }
            });
    },
};

window.AdBlockModule = AdBlockModule;
