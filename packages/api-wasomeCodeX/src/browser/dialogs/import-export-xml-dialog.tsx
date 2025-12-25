import * as React from 'react';
import { ReactDialog } from '@theia/core/lib/browser/dialogs/react-dialog';

interface TreeNode {
    label: string;
    value: string;
    checked?: boolean;
    expanded?: boolean;
    children?: TreeNode[];
}
interface TreeDialogProps {
    title: string;
    treeData: TreeNode[];
    selectAllLabel?: string;
}
export class ImportExportXmlDialog extends ReactDialog<any> {
    private selectAllLabel: string;
    state: any = {
        conflict_rule: '', // 导入操作方式
        tree: [],
        allChecked: true, // 默认全选
        rootExpanded: false, // 根节点（全选）默认收起
    };
    private propsTitle: string;
    private error: string;

    constructor(props: TreeDialogProps) {
        super({ title: props.title });
        this.appendCloseButton('取消');
        this.appendAcceptButton('确定');
        this.state = {
            tree: props.treeData.map(node => ({ ...node })), // 深拷贝
            allChecked: true, // 默认全选
            rootExpanded: false, // 默认收起
        };
        this.propsTitle = props.title;
        this.selectAllLabel = props.selectAllLabel || '全选';
        // 初始化时全选所有节点
        this.setAllChecked(this.state.tree, true);
        // 初始化时全部收起
        this.setAllExpanded(this.state.tree, false);
    }
    get value() {
        return this.state;
    }
    // 判断节点是否半选（所有子节点都未选中则不是半选）
    isIndeterminate(node: TreeNode): boolean {
        if (!node.children || node.children.length === 0) return false;
        let checkedCount = 0, indeterminateCount = 0;
        for (const child of node.children) {
            if (child.checked && !this.isIndeterminate(child)) checkedCount++;
            else if (this.isIndeterminate(child)) indeterminateCount++;
        }
        // 只要有子节点被选中或半选，且不是全部选中，则半选
        const total = node.children.length;
        return (checkedCount + indeterminateCount) > 0 && checkedCount < total;
    }

    // 递归渲染树，支持半选
    renderTree(nodes: TreeNode[], parentIndex: string = '', level: number = 0): React.ReactNode {
        return (
            <ul style={{ listStyle: 'none', paddingLeft: 16 }}>
                {nodes.map((node, idx) => {
                    const index = parentIndex + idx;
                    return (
                        <li key={index}>
                            {/* 展开箭头或占位 */}
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 16,
                                    marginRight: 4,
                                    textAlign: 'center',
                                    cursor: node.children && node.children.length > 0 ? 'pointer' : 'default',
                                    userSelect: 'none',
                                    transition: 'transform 0.2s',
                                    transform: node.children && node.children.length > 0 && node.expanded ? 'rotate(90deg)' : 'rotate(0deg)'
                                }}
                                onClick={node.children && node.children.length > 0 ? () => this.toggleExpand(index) : undefined}
                            >
                                {node.children && node.children.length > 0 ? (
                                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block', margin: '0 auto' }}>
                                        <polygon points="3,2 9,6 3,10" fill="#888" />
                                    </svg>
                                ) : null}
                            </span>
                            <input
                                type="checkbox"
                                checked={!!node.checked}
                                ref={el => {
                                    if (el) el.indeterminate = this.isIndeterminate(node);
                                }}
                                onChange={() => this.toggleCheck(index)}
                                style={{ verticalAlign: 'middle' }}
                            />
                            <span style={{ verticalAlign: 'middle' }}>{node.label}</span>
                            {node.children && node.children.length > 0 && node.expanded && (
                                <div>
                                    {this.renderTree(node.children, index + '-', level + 1)}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    }

    // 递归设置所有节点选中状态
    setAllChecked(nodes: TreeNode[], checked: boolean) {
        for (const node of nodes) {
            node.checked = checked;
            if (node.children) this.setAllChecked(node.children, checked);
        }
    }

    // 递归查找并切换选中，支持父节点半选联动
    toggleCheck(index: string) {
        const path = index.split('-').map(Number);
        const tree = [...this.state.tree];
        let nodes = tree;
        let node: TreeNode | undefined;
        for (const i of path) {
            node = nodes[i];
            if (!node) return;
            nodes = node.children || [];
        }
        if (node) {
            const checked = !node.checked;
            node.checked = checked;
            if (node.children) this.setAllChecked(node.children, checked);
            // 向上递归更新父节点半选/全选状态
            this.updateParentCheckState(tree, path);
            this.state.tree = tree;
            this.update();
        }
    }

    // 递归向上更新父节点的选中/半选状态
    updateParentCheckState(tree: TreeNode[], path: number[]) {
        if (path.length === 0) return;
        const parentPath = path.slice(0, -1);
        let nodes = tree;
        let parent: TreeNode | undefined;
        for (const i of parentPath) {
            parent = nodes[i];
            if (!parent) return;
            nodes = parent.children || [];
        }
        if (parent && parent.children) {
            const allChecked = parent.children.every(child => child.checked);
            const noneChecked = parent.children.every(child => !child.checked && !this.isIndeterminate(child));
            if (allChecked) {
                parent.checked = true;
            } else if (noneChecked) {
                parent.checked = false;
            } else {
                parent.checked = false; // 只用indeterminate渲染半选
            }
            // 递归向上
            this.updateParentCheckState(tree, parentPath);
        }
    }

    // 递归查找并切换展开
    toggleExpand(index: string) {
        const path = index.split('-').map(Number);
        const tree = [...this.state.tree];
        let nodes = tree;
        let node: TreeNode | undefined;
        for (const i of path) {
            node = nodes[i];
            if (!node) return;
            nodes = node.children || [];
        }
        if (node) {
            node.expanded = !node.expanded;
            this.state.tree = tree;
            this.update();
        }
    }

    // 全选/全不选，半选时点击为全选
    handleAllCheck = () => {
        // 判断当前是否全选
        const allChecked = this.state.tree.every((node: any) => node.checked && !this.isIndeterminate(node));
        const tree = [...this.state.tree];
        // 如果已经全选，则取消全选，否则全选
        this.setAllChecked(tree, !allChecked);
        this.state.tree = tree;
        this.state.allChecked = !allChecked;
        this.update();
    };

    handleRootExpand = () => {
        this.state.rootExpanded = !this.state.rootExpanded;
        // 展开时，根下的节点是否全部展开可根据需要递归展开
        this.update();
    };

    // 获取所有选中的节点
    getCheckedValues(nodes: TreeNode[]): string[] {
        let result: string[] = [];
        for (const node of nodes) {
            if (node.checked) result.push(node.value);
            if (node.children) result = result.concat(this.getCheckedValues(node.children));
        }
        return result;
    }

    // 展开/收起所有节点
    handleExpandAll = (expand: boolean) => {
        const tree = [...this.state.tree];
        this.setAllExpanded(tree, expand);
        this.state.tree = tree;
        this.state.allExpanded = expand;
        this.update();
    };

    // 递归设置所有节点展开/收起
    setAllExpanded(nodes: TreeNode[], expanded: boolean) {
        for (const node of nodes) {
            node.expanded = expanded;
            if (node.children) this.setAllExpanded(node.children, expanded);
        }
    }

    protected render(): React.ReactNode {
        // 全选半选逻辑：只要有子节点没全选就半选
        const allChecked = this.state.tree.every((node: any) => node.checked && !this.isIndeterminate(node));
        const allIndeterminate = !allChecked && this.state.tree.some((node: any) => node.checked || this.isIndeterminate(node));
        return (
            <div style={{ minWidth: 400, minHeight: 300 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* 展开/收起箭头，放在全选左侧 */}
                    <span
                        style={{ cursor: 'pointer', marginRight: 4, display: 'inline-block', width: 12, height: 12, userSelect: 'none', transition: 'transform 0.2s', transform: this.state.rootExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        onClick={this.handleRootExpand}
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
                            <polygon points="3,2 9,6 3,10" fill="#888" />
                        </svg>
                    </span>
                    <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = allIndeterminate; }}
                        onChange={this.handleAllCheck}
                    />
                    <span>{this.selectAllLabel || '全选'}</span>
                </div>
                {this.state.rootExpanded && this.renderTree(this.state.tree)}
                {/* 仅当 selectAllLabel 含有“导入”时显示下拉框 */}
                {this.propsTitle.includes('导入') && (
                    <div style={{ marginTop: 12 }}>
                        <label htmlFor="import-action-select" style={{ marginRight: 8 }}>同名处理：</label>
                        <select
                            id="import-action-select"
                            value={this.state.conflict_rule || 'merge'}
                            onChange={e => {
                                this.state.conflict_rule = e.target.value;
                                this.update();
                            }}
                            style={{ minWidth: 120 }}
                        >
                            <option value="merge">覆盖合并</option>
                            <option value="ignore">忽略</option>
                            <option value="replace">重命名</option>
                        </select>
                    </div>
                )}
                <div style={{ color: 'red', marginTop: 8 }}>{this.error}</div>
            </div>
        );
    }

    // 判断所有节点是否都展开
    isAllExpanded(nodes: TreeNode[]): boolean {
        for (const node of nodes) {
            if (node.children && node.children.length > 0) {
                if (!node.expanded || !this.isAllExpanded(node.children)) {
                    return false;
                }
            }
        }
        return true;
    }

    protected override async accept(): Promise<void> {
        const noneChecked = this.state.tree.every(
            (node: any) => !node.checked && !this.isIndeterminate(node)
        );
        if (noneChecked) {
            this.error = '请至少选择一个节点';
            this.update();
            return
        }
        // 代表导入
        if (this.propsTitle.includes('导入')) {
            if (!this.state.conflict_rule) {
                this.error = '请选择同名处理方式';
                this.update();
                return;
            }
        }
        this.error = '';
        this.update();
        if (this.resolve) {
            // this.resolve(this.getCheckedValues(this.state.tree));
            this.resolve(this.state.tree);
        }
        this.dispose();
    }
}
