// 简体中文

import type { CommandName } from "src/settings/defaultCommands";

import type { en } from "src/translations/en";

const ui: Partial<Record<keyof typeof en, string>> = {
  dragCommandsHere: "拖拽到此处",
  add: "添加",
  addSeparator: "添加分割线",
  addSubmenu: "添加子菜单",
  addCommandOntoEditingToolbar:
    "从Obsidian的命令库中添加一个命令到工具栏。要重新排列命令，可以拖放命令项。要删除它们，请使用命令项右边的删除按钮。",
  appearance: "外观",
  buttonSubmenu: "按钮子菜单",
  calloutType: "Callout 类型",
  cancel: "取消",
  changeCommandName: "更改命令名称",
  changeSubmenuName: "更改子菜单名称",
  chooseCommand: "选择一个命令",
  chooseIcon: "选择一个图标",
  closed: "折叠",
  collapseState: "折叠状态",
  confirm: "确认",
  confirmDelete: "确认删除？",
  content: "内容",
  customBackgroundColor: "设置自定义背景色",
  customFontColor: "设置自定义字体颜色",
  customFontColors: "自定义字体颜色",
  customColors: "自定义颜色",
  themeColors: "主题颜色",
  standardColors: "标准颜色",
  translucentColors: "半透明颜色",
  highlighterColors: "荧光笔颜色",
  delete: "删除",
  dropdownMenu: "下拉菜单",
  editingToolbarCommands: "在工具栏中添加命令",
  general: "常规",
  inputContent: "输入内容",
  inputTitle: "输入标题",
  insert: "插入",
  menuTypeChanged: "菜单类型已更改为",
  more: "更多",
  open: "展开",
  optionalLeaveBlankDefaultTitle: "可选，留空则使用默认标题",
  pleaseEnterNewName: "请输入新名称：",
  reset: "重置",
  setBackgroundColorToolbar: "设置工具栏的背景颜色",
  setColorToolbarIcon: "设置工具栏图标颜色",
  setSizeToolbarIconPx: "设置工具栏图标大小（px）默认18px",
  commandAlreadyExists: "命令 {name} 已存在",
  title: "标题",
  toolbarBackgroundColor: "工具栏背景颜色",
  toolbarCommands: "工具栏命令",
  toolbarIconColor: "工具栏图标颜色",
  toolbarIconSize: "工具栏图标大小",
  toolbarPreviewLabel: "工具栏预览（按钮仅供参考）",
  toInsert: "插入",
  setCustomBackground: "🎨 设置自定义背景",
  setCustomFontColor: "🖌️ 设置自定义字体颜色",
};

export default ui;

export const commandNames: Record<CommandName, string> = {
  "Toggle toolbar": "显示/隐藏工具栏",

  "Undo edit": "撤销编辑",
  "Redo edit": "重做编辑",
  Cut: "剪切",
  Copy: "复制",
  Paste: "粘贴",

  "Remove header level": "取消标题",
  "Header 1": "标题 1",
  "Header 2": "标题 2",
  "Header 3": "标题 3",
  "Header 4": "标题 4",
  "Header 5": "标题 5",
  "Header 6": "标题 6",

  Underline: "下划线",
  Superscript: "上标",
  Subscript: "下标",
  "Clear text formatting": "清除文本格式",
  "Change font color": "更改字体颜色",
  "Change background color": "更改背景颜色",

  "Justify text": "两端对齐",
  "Align text left": "左对齐",
  "Center text": "居中对齐",
  "Align text right": "右对齐",

  Callout: "标注",

  Headings: "标题",
  Edit: "编辑",
  Quotes: "引用",
  "Markdown syntax": "Markdown 语法",
  Lists: "列表",
  Alignment: "对齐",
  Submenu: "子菜单",
  "Vertical split": "分隔线",
};
