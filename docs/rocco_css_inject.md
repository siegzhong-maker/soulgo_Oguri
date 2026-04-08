This file holds raw CSS for scripts; content between BEGIN and END is extracted by the patcher.

BEGIN_ROCCO_CSS
        /* 见闻柜 / 详情：洛克式外框 + 羊皮纸内衬 */
        #modal-panel[data-modal-variant="cabinet"] {
            color: #3d2e24;
            background:
                linear-gradient(165deg, rgba(255, 252, 245, 0.97) 0%, rgba(245, 232, 210, 0.98) 45%, rgba(236, 218, 188, 0.99) 100%);
            border: 3px solid transparent;
            background-clip: padding-box;
            box-shadow:
                0 0 0 2px rgba(212, 175, 95, 0.85),
                0 0 0 5px rgba(45, 32, 68, 0.92),
                0 0 0 7px rgba(120, 90, 50, 0.35),
                inset 0 1px 0 rgba(255, 255, 255, 0.65),
                0 22px 48px rgba(25, 15, 40, 0.45);
        }
        #modal-panel[data-modal-variant="cabinet"] > div:first-of-type {
            border-bottom: 1px solid rgba(139, 105, 60, 0.35);
            padding-bottom: 0.5rem;
            margin-bottom: 0.35rem;
        }
        #modal-panel[data-modal-variant="cabinet"] #modal-title {
            color: #2c2140;
            text-shadow: 0 1px 0 rgba(255, 248, 230, 0.9);
            font-weight: 800;
            letter-spacing: 0.02em;
        }
        #modal-panel[data-modal-variant="cabinet"][data-cabinet-subview="detail"] #modal-title {
            color: #3d2a1a;
        }
        /* 立绘灯箱：关闭键与主弹层同为透明底、无圆框 */
        .soul-portrait-lightbox-close-btn {
            -webkit-tap-highlight-color: transparent;
            background: transparent;
            border: none;
            box-shadow: none;
            border-radius: 0;
        }
        /* 列表态：图鉴文案居中；详情态：左对齐更易读 */
        #modal-panel[data-modal-variant="cabinet"]:not([data-cabinet-subview="detail"]) #modal-body .cabinet-item-catalog {
            text-align: center;
        }
        #modal-panel[data-modal-variant="cabinet"]:not([data-cabinet-subview="detail"]) #modal-body .cabinet-item-catalog .cabinet-catalog-line {
            text-align: center;
            text-wrap: pretty;
        }
        #modal-panel[data-modal-variant="cabinet"][data-cabinet-subview="detail"] #modal-body .cabinet-item-catalog,
        #modal-panel[data-modal-variant="cabinet"][data-cabinet-subview="detail"] #modal-body .cabinet-item-catalog .cabinet-catalog-line {
            text-align: left;
            text-wrap: pretty;
        }

        .cabinet-modal {
            position: relative;
            color: #3d2e24;
        }
        .cabinet-modal .text-gray-800 { color: #3d2e24; }
        .cabinet-modal .text-gray-400 { color: #6b5c4d; }

        .cabinet-layout {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 0;
            gap: 0.55rem;
        }
        .cabinet-chrome-bar {
            flex-shrink: 0;
        }
        .cabinet-progress-row {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        @media (min-width: 480px) {
            .cabinet-progress-row {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 0.75rem;
            }
        }
        .cabinet-progress-block {
            flex: 1;
            min-width: 0;
        }
        .cabinet-progress-meter {
            height: 8px;
            border-radius: 999px;
            background: rgba(92, 74, 58, 0.14);
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
            overflow: hidden;
            margin-top: 4px;
        }
        .cabinet-progress-meter__fill {
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(90deg, #d4c4a8 0%, #b8956a 45%, #8f6a3e 100%);
            box-shadow: 0 0 8px rgba(143, 106, 62, 0.28);
            transition: width 0.35s ease;
        }
        .cabinet-segment-wrap {
            display: flex;
            border-radius: 0.65rem;
            padding: 3px;
            background: linear-gradient(180deg, rgba(45, 32, 68, 0.14) 0%, rgba(45, 32, 68, 0.06) 100%);
            box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(120, 90, 50, 0.35);
            flex-shrink: 0;
            align-self: stretch;
        }
        @media (min-width: 480px) {
            .cabinet-segment-wrap {
                align-self: center;
            }
        }
        .cabinet-segment-btn {
            flex: 1;
            min-width: 4.5rem;
            padding: 0.35rem 0.75rem;
            border-radius: 0.5rem;
            font-size: 11px;
            font-weight: 800;
            border: none;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .cabinet-segment-btn--active {
            background: linear-gradient(180deg, #a89878 0%, #7d6b52 48%, #5c4d3d 100%);
            color: #fffaf3;
            box-shadow:
                0 1px 0 rgba(255, 255, 255, 0.28) inset,
                0 3px 10px rgba(70, 55, 40, 0.28);
        }
        .cabinet-segment-btn--idle {
            background: transparent;
            color: #5c4a6e;
        }
        .cabinet-segment-btn--idle:hover {
            background: rgba(255, 255, 255, 0.45);
        }

        .cabinet-main-panel {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            padding: 0.55rem 0.62rem 0.6rem;
            border-radius: 0.85rem;
            background:
                linear-gradient(180deg, rgba(255, 252, 245, 0.92) 0%, rgba(248, 238, 220, 0.96) 100%);
            border: 1px solid rgba(139, 105, 60, 0.28);
            box-shadow:
                inset 0 0 0 1px rgba(255, 255, 255, 0.55),
                inset 0 -2px 8px rgba(80, 50, 30, 0.06),
                0 6px 16px rgba(45, 32, 68, 0.08);
        }
        .cabinet-footer-hint {
            flex-shrink: 0;
            text-align: center;
            font-size: 10px;
            color: #6b5c4d;
            opacity: 0.88;
            padding-top: 0.15rem;
        }

        .cabinet-matrix-toolbar {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            margin-bottom: 0.6rem;
        }
        .cabinet-matrix-toolbar__meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.35rem 0.5rem;
            min-width: 0;
        }
        .cabinet-matrix-toolbar__filters {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.5rem;
            align-items: stretch;
        }
        @media (min-width: 520px) {
            .cabinet-matrix-toolbar__filters {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
        }
        .cabinet-matrix-toolbar__actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 0.55rem;
            margin-top: 0.2rem;
        }
        .cabinet-matrix-toolbar__views {
            display: flex;
            gap: 0.45rem;
            flex-wrap: wrap;
            margin-left: auto;
        }
        .cabinet-hobby-chip {
            display: inline-flex;
            align-items: center;
            max-width: 100%;
            margin-top: 0;
            padding: 0.2rem 0.45rem;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 800;
            line-height: 1.25;
            color: #5c4a38;
            background: linear-gradient(180deg, rgba(255, 250, 255, 0.95), rgba(235, 224, 205, 0.92));
            border: 1px solid rgba(160, 135, 100, 0.42);
            box-shadow: 0 1px 3px rgba(70, 55, 40, 0.1);
        }

        .cabinet-matrix-layout-btn {
            font-size: 9px;
            font-weight: 800;
            padding: 0.3rem 0.55rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(120, 90, 50, 0.35);
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(245, 235, 220, 0.85));
            color: #5c4a6e;
            cursor: pointer;
            transition: box-shadow 0.15s ease, opacity 0.15s ease;
        }
        .cabinet-matrix-layout-btn--active {
            opacity: 1;
            box-shadow:
                0 0 0 2px rgba(184, 154, 106, 0.55),
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
            border-color: rgba(143, 106, 62, 0.45);
            color: #5c4a38;
        }
        .cabinet-matrix-layout-btn:not(.cabinet-matrix-layout-btn--active) {
            opacity: 0.72;
        }

        /* 物品详情：宽屏左图右文 */
        .cabinet-item-detail.cabinet-detail-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0.9rem;
            align-items: start;
            width: 100%;
            max-height: 85vh;
            overflow-y: auto;
            padding: 0.35rem 0.2rem 0.5rem;
        }
        @media (min-width: 420px) {
            .cabinet-item-detail.cabinet-detail-grid {
                grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.12fr);
                gap: 0.85rem 1rem;
            }
        }
        .cabinet-detail-art-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 0;
        }
        @media (min-width: 420px) {
            .cabinet-detail-art-column {
                position: sticky;
                top: 0;
                align-self: start;
            }
        }
        .cabinet-detail-artframe {
            position: relative;
            width: 100%;
            min-height: 140px;
            max-height: min(52vw, 220px);
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.65rem;
            box-sizing: border-box;
            background:
                radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255, 255, 255, 0.55) 0%, transparent 55%),
                linear-gradient(165deg, #fffdf6 0%, #e8d4b8 45%, #c9a66b 100%);
            border: 2px solid rgba(212, 175, 95, 0.85);
            box-shadow:
                0 0 0 2px rgba(45, 32, 68, 0.25),
                inset 0 2px 6px rgba(255, 255, 255, 0.65),
                inset 0 -3px 10px rgba(100, 70, 40, 0.15),
                0 10px 24px rgba(45, 32, 68, 0.18);
        }
        .cabinet-detail-artframe::before,
        .cabinet-detail-artframe::after {
            content: '';
            position: absolute;
            width: 10px;
            height: 10px;
            border: 2px solid rgba(100, 82, 58, 0.38);
            pointer-events: none;
        }
        .cabinet-detail-artframe::before {
            top: 5px;
            left: 5px;
            border-right: none;
            border-bottom: none;
            border-radius: 3px 0 0 0;
        }
        .cabinet-detail-artframe::after {
            bottom: 5px;
            right: 5px;
            border-left: none;
            border-top: none;
            border-radius: 0 0 3px 0;
        }
        .cabinet-detail-artframe img {
            position: relative;
            z-index: 1;
            max-width: 100%;
            width: auto;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(45, 32, 68, 0.2));
            min-height: 112px;
            max-height: min(48vw, 200px);
        }
        .cabinet-detail-info-column {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            min-width: 0;
            text-align: center;
        }
        .cabinet-detail-actions {
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            width: 100%;
            margin-top: 0.15rem;
        }
        @media (min-width: 420px) {
            .cabinet-detail-info-column {
                text-align: left;
            }
            .cabinet-detail-info-column .cabinet-detail-badges {
                justify-content: flex-start;
            }
        }
        .cabinet-detail-badges {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.35rem;
        }
        .cabinet-detail-actions .cabinet-detail-primary-btn {
            margin-top: 0;
        }
        .cabinet-detail-primary-btn {
            width: 100%;
            margin-top: 0.65rem;
            padding: 0.75rem 0.85rem;
            border: none;
            border-radius: 0.65rem;
            font-weight: 800;
            font-size: 13px;
            color: #fffaf5;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            background: linear-gradient(180deg, #c9a87a 0%, #9a7349 42%, #6b4e32 100%);
            box-shadow:
                0 1px 0 rgba(255, 255, 255, 0.3) inset,
                0 4px 14px rgba(80, 55, 35, 0.32);
            transition: transform 0.12s ease, filter 0.12s ease;
        }
        .cabinet-detail-primary-btn:hover {
            filter: brightness(1.05);
        }
        .cabinet-detail-primary-btn:active {
            transform: scale(0.98);
        }
        .cabinet-detail-actions .cabinet-detail-back-btn {
            margin-top: 0;
        }
        .cabinet-detail-back-btn {
            margin-top: 0.5rem;
            align-self: center;
            padding: 0.35rem 0.85rem;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            color: #5c5348;
            background: rgba(255, 255, 255, 0.55);
            border: 1px solid rgba(120, 90, 50, 0.35);
            cursor: pointer;
            transition: background 0.15s ease;
        }
        @media (min-width: 420px) {
            .cabinet-detail-back-btn {
                align-self: flex-start;
            }
        }
        .cabinet-detail-back-btn:hover {
            background: rgba(255, 255, 255, 0.85);
        }
        #modal-panel[data-modal-variant="cabinet"][data-cabinet-subview="detail"] .cabinet-catalog-details {
            text-align: left;
            border-radius: 0.65rem;
            border: 1px solid rgba(139, 105, 60, 0.3);
            background: linear-gradient(180deg, rgba(255, 252, 245, 0.95), rgba(245, 232, 210, 0.88));
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
            margin-top: 0.2rem;
        }
        #modal-panel[data-modal-variant="cabinet"][data-cabinet-subview="detail"] .cabinet-catalog-details summary {
            text-align: left;
        }
END_ROCCO_CSS
