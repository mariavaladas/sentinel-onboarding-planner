// topology.js — SIEM ingestion topology visualization using React Flow

const PATH_CONFIGS = {
    syslog_cef: { color: '#f59e0b', sourceLabel: 'On-Premises / IaaS', sourceIcon: '🖥️', pathType: 'server', serverLabel: 'Linux Forwarder', agentLabel: 'AMA Agent', dcr: 'DCR: Syslog/CEF', protocol: 'Syslog / CEF' },
    api: { color: '#8b5cf6', sourceLabel: 'Cloud / SaaS Vendors', sourceIcon: '☁️', pathType: 'boxes', pathBoxes: [{ icon: '🔌', label: 'CCP / API Connector' }], dcr: 'DCR: Custom Tables', protocol: 'REST API (Polling)' },
    azure_native: { color: '#0078d4', sourceLabel: 'Azure Resources', sourceIcon: '⛅', pathType: 'boxes', pathBoxes: [{ icon: '⚙️', label: 'Diagnostic Settings' }], dcr: null, protocol: 'Azure Resource Manager' },
    direct: { color: '#10b981', sourceLabel: 'Microsoft 365 / Defender', sourceIcon: '🛡️', pathType: 'boxes', pathBoxes: [{ icon: '⚡', label: 'Native Connector' }], dcr: null, protocol: 'Direct Integration' },
    logic_app: { color: '#ec4899', sourceLabel: 'Custom / Third-Party APIs', sourceIcon: '🔗', pathType: 'boxes', pathBoxes: [{ icon: '⚙️', label: 'Logic App / Function' }, { icon: '📡', label: 'Data Collector API' }], dcr: 'DCR: Custom Logs', protocol: 'HTTP (Webhook/Poll)' },
    windows_events: { color: '#06b6d4', sourceLabel: 'Windows Servers', sourceIcon: '🪟', pathType: 'server', serverLabel: 'Windows Server', agentLabel: 'AMA Agent', dcr: 'DCR: Security Events', protocol: 'Windows Events (XPath)' },
    event_hub: { color: '#f97316', sourceLabel: 'Event Hub Sources', sourceIcon: '📨', pathType: 'boxes', pathBoxes: [{ icon: '📨', label: 'Event Hub' }, { icon: '⚙️', label: 'Ingestion Pipeline' }], dcr: 'DCR: Event Hub', protocol: 'Event Hub Streaming' }
};

function classifySolution(solution) {
    const infra = solution?.onboarding?.infrastructure || [];
    const category = solution?.export_metadata?.group || '';
    const is1P = solution?.is1P;
    const tags = (solution?.tags || []).map((t) => t.toLowerCase());

    if (infra.includes('linux-forwarder') || tags.some((t) => t.includes('syslog') || t.includes('cef'))) return 'syslog_cef';
    if (infra.includes('event-hub')) return 'event_hub';
    if (infra.includes('logic-app') || infra.includes('azure-function')) return 'logic_app';
    if (is1P && (category === 'Microsoft' || tags.some((t) => t.includes('defender') || t.includes('m365')))) return 'direct';
    if (is1P && tags.some((t) => t.includes('azure'))) return 'azure_native';
    if (infra.includes('vm') || infra.includes('agent') || tags.some((t) => t.includes('windows'))) return 'windows_events';
    if (is1P) return 'azure_native';
    return 'api';
}

async function renderTopologyCanvas(containerEl) {
    const module = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
    const html2canvas = module.default;
    return html2canvas(containerEl, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true
    });
}

export async function exportTopologyAsPdf(containerEl) {
    if (!containerEl) return;

    const [{ jsPDF }, canvas] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'),
        renderTopologyCanvas(containerEl)
    ]);
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 20));
    pdf.save('sentinel-ingestion-topology.pdf');
}

export async function exportTopologyAsPng(containerEl) {
    if (!containerEl) return;

    const canvas = await renderTopologyCanvas(containerEl);
    const link = document.createElement('a');
    link.download = 'sentinel-ingestion-topology.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export function renderTopology(selectedSolutions, containerEl) {
    if (!containerEl) return;

    if (!window.React || !window.ReactDOM || !window.ReactFlow) {
        containerEl.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
                <p>Topology dependencies did not load. Refresh the page to try again.</p>
            </div>`;
        return;
    }

    const groups = {};
    selectedSolutions.forEach((sol) => {
        const type = classifySolution(sol);
        if (!groups[type]) groups[type] = [];
        groups[type].push(sol);
    });

    if (Object.keys(groups).length === 0) {
        containerEl.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
                <div style="font-size:3rem;margin-bottom:16px;">🔍</div>
                <p>No solutions selected yet. Go back to select data sources to see your ingestion topology.</p>
            </div>`;
        return;
    }

    const { createElement: h } = React;
    const { ReactFlow: RF, ReactFlowProvider, Controls, Background, Handle, Position } = window.ReactFlow;

    const nodes = [];
    const edges = [];
    const groupEntries = Object.entries(groups);
    const rowSpacing = 200;
    const startY = 30;
    const sentinelX = 900;
    const sentinelY = startY + ((groupEntries.length - 1) * rowSpacing) / 2;

    nodes.push({
        id: 'sentinel',
        type: 'sentinel',
        position: { x: sentinelX, y: sentinelY - 60 },
        data: { workspace: 'Log Analytics Workspace' },
        draggable: true
    });

    groupEntries.forEach(([type, solutions], rowIdx) => {
        const pc = PATH_CONFIGS[type] || PATH_CONFIGS.api;
        const y = startY + rowIdx * rowSpacing;
        const sourceId = `source-${type}`;

        nodes.push({
            id: sourceId,
            type: 'source',
            position: { x: 0, y },
            data: { solutions, pc, type },
            draggable: true
        });

        if (pc.pathType === 'server') {
            const serverId = `server-${type}`;
            nodes.push({ id: serverId, type: 'server', position: { x: 380, y: y + 10 }, data: { serverLabel: pc.serverLabel, agentLabel: pc.agentLabel, color: pc.color }, draggable: true });
            edges.push({ id: `e-${sourceId}-${serverId}`, source: sourceId, target: serverId, animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });

            if (pc.dcr) {
                const dcrId = `dcr-${type}`;
                nodes.push({ id: dcrId, type: 'dcr', position: { x: 600, y: y + 25 }, data: { label: pc.dcr, color: pc.color }, draggable: true });
                edges.push({ id: `e-${serverId}-${dcrId}`, source: serverId, target: dcrId, animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });
                edges.push({ id: `e-${dcrId}-sentinel`, source: dcrId, target: 'sentinel', animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });
            } else {
                edges.push({ id: `e-${serverId}-sentinel`, source: serverId, target: 'sentinel', animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });
            }
        } else {
            let prevId = sourceId;
            pc.pathBoxes.forEach((box, boxIdx) => {
                const boxId = `box-${type}-${boxIdx}`;
                nodes.push({ id: boxId, type: 'pathBox', position: { x: 380 + boxIdx * 180, y: y + 15 }, data: { icon: box.icon, label: box.label, color: pc.color }, draggable: true });
                edges.push({ id: `e-${prevId}-${boxId}`, source: prevId, target: boxId, animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });
                prevId = boxId;
            });

            if (pc.dcr) {
                const dcrId = `dcr-${type}`;
                nodes.push({ id: dcrId, type: 'dcr', position: { x: 380 + pc.pathBoxes.length * 180, y: y + 20 }, data: { label: pc.dcr, color: pc.color }, draggable: true });
                edges.push({ id: `e-${prevId}-${dcrId}`, source: prevId, target: dcrId, animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });
                edges.push({ id: `e-${dcrId}-sentinel`, source: dcrId, target: 'sentinel', animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });
            } else {
                edges.push({ id: `e-${prevId}-sentinel`, source: prevId, target: 'sentinel', animated: true, style: { stroke: pc.color, strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: pc.color } });
            }
        }
    });

    const legendItems = [...new Map(groupEntries.map(([type]) => {
        const pc = PATH_CONFIGS[type] || PATH_CONFIGS.api;
        return [pc.protocol, { color: pc.color, label: pc.protocol }];
    })).values()];

    containerEl.innerHTML = `
        <div class="topo-container">
            <div id="reactflow-topology" class="topo-flow-wrapper"></div>
            <div class="topo-legend">
                <div class="topo-legend-title">Legend — Ingestion Methods</div>
                ${legendItems.map((l) => `<div class="topo-legend-item"><div class="topo-legend-swatch" style="background:${l.color}"></div>${l.label}</div>`).join('')}
            </div>
            <div class="topo-info-cards">
                <div class="topo-info-card">
                    <h4>🏗 Workspace</h4>
                    <p><strong>Log Analytics Workspace</strong></p>
                </div>
                <div class="topo-info-card">
                    <h4>📈 Connectors</h4>
                    <p><strong>${selectedSolutions.length}</strong> data connectors across <strong>${Object.keys(groups).length}</strong> ingestion methods</p>
                </div>
                <div class="topo-info-card">
                    <h4>📊 Estimated Volume</h4>
                    <p>~${selectedSolutions.length * 3}–${selectedSolutions.length * 15} GB/day</p>
                </div>
            </div>
        </div>`;

    function SourceNode({ data }) {
        const { solutions, pc } = data;
        const items = solutions.slice(0, 5).map((s, i) =>
            h('div', { key: i, className: 'rf-source-item', style: { borderLeftColor: pc.color } },
                h('div', { className: 'rf-source-name' }, s.name)
            )
        );
        const moreCount = solutions.length - 5;
        return h('div', { className: 'rf-source-node' },
            h('div', { className: 'rf-source-node-title' }, pc.sourceIcon, ' ', pc.sourceLabel),
            ...items,
            moreCount > 0 ? h('div', { className: 'rf-source-item', style: { borderLeftColor: pc.color, color: 'var(--text-muted)' } }, `+${moreCount} more`) : null,
            h(Handle, { type: 'source', position: Position.Right, style: { background: pc.color, width: 8, height: 8 } })
        );
    }

    function PathBoxNode({ data }) {
        return h('div', { className: 'rf-path-node', style: { borderColor: data.color } },
            h(Handle, { type: 'target', position: Position.Left, style: { background: data.color, width: 6, height: 6 } }),
            h('span', { className: 'rf-path-icon' }, data.icon),
            data.label,
            h(Handle, { type: 'source', position: Position.Right, style: { background: data.color, width: 6, height: 6 } })
        );
    }

    function ServerNode({ data }) {
        return h('div', { className: 'rf-server-node', style: { borderColor: data.color } },
            h(Handle, { type: 'target', position: Position.Left, style: { background: data.color, width: 6, height: 6 } }),
            h('div', { className: 'rf-server-icon' }, '🖳'),
            h('div', { className: 'rf-server-label' }, data.serverLabel),
            h('div', { className: 'rf-server-agent' }, '📡 ', data.agentLabel),
            h(Handle, { type: 'source', position: Position.Right, style: { background: data.color, width: 6, height: 6 } })
        );
    }

    function DCRNode({ data }) {
        return h('div', { className: 'rf-dcr-node', style: { borderColor: data.color, color: data.color } },
            h(Handle, { type: 'target', position: Position.Left, style: { background: data.color, width: 5, height: 5 } }),
            data.label,
            h(Handle, { type: 'source', position: Position.Right, style: { background: data.color, width: 5, height: 5 } })
        );
    }

    function SentinelNode({ data }) {
        return h('div', { className: 'rf-sentinel-node' },
            h(Handle, { type: 'target', position: Position.Left, style: { background: '#0078d4', width: 10, height: 10 } }),
            h('div', { className: 'rf-sentinel-icon' }, '🛡️'),
            h('div', { className: 'rf-sentinel-label' }, 'Microsoft Sentinel'),
            h('div', { className: 'rf-sentinel-sub' }, data.workspace),
            h('div', { className: 'rf-sentinel-portal' }, '🌐 Unified Defender XDR Portal', h('br'), h('code', null, 'security.microsoft.com'))
        );
    }

    function FlowWrapper() {
        const nt = React.useMemo(() => ({ source: SourceNode, pathBox: PathBoxNode, server: ServerNode, dcr: DCRNode, sentinel: SentinelNode }), []);
        return h(RF, {
            defaultNodes: nodes,
            defaultEdges: edges,
            nodeTypes: nt,
            fitView: true,
            fitViewOptions: { padding: 0.2 },
            proOptions: { hideAttribution: true },
            defaultEdgeOptions: { type: 'smoothstep', animated: true },
            minZoom: 0.3,
            maxZoom: 2,
            nodesDraggable: true,
            style: { background: 'transparent' }
        },
            h(Controls, { showInteractive: false }),
            h(Background, { variant: 'dots', gap: 20, size: 1, color: 'rgba(255,255,255,0.05)' })
        );
    }

    const app = h(ReactFlowProvider, null, h(FlowWrapper));
    const topoContainer = document.getElementById('reactflow-topology');
    const root = ReactDOM.createRoot(topoContainer);
    root.render(app);
}
