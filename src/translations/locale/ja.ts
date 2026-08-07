// 日本語

import type { CommandName } from "src/settings/defaultCommands";

import type { en } from "src/translations/en";

const ui: Partial<Record<keyof typeof en, string>> = {
  dragCommandsHere: "ここにドラッグ",
  add: "追加",
  cancel: "キャンセル",
  customBackgroundColor: "背景色を選択",
  customFontColor: "文字色を選択",
  customFontColors: "カスタム文字色",
  customColors: "カスタムカラー",
  themeColors: "テーマの色",
  standardColors: "標準の色",
  translucentColors: "半透明の色",
  highlighterColors: "蛍光ペンの色",
  more: "その他",
};

export default ui;

export const commandNames: Record<CommandName, string> = {
  "Toggle toolbar": "ツールバーの表示切り替え",

  "Undo edit": "元に戻す",
  "Redo edit": "やり直す",
  Cut: "切り取り",
  Copy: "コピー",
  Paste: "貼り付け",

  "Remove header level": "見出しを解除",
  "Header 1": "見出し1",
  "Header 2": "見出し2",
  "Header 3": "見出し3",
  "Header 4": "見出し4",
  "Header 5": "見出し5",
  "Header 6": "見出し6",

  Underline: "下線",
  Superscript: "上付き文字",
  Subscript: "下付き文字",
  "Clear text formatting": "文字書式をクリア",
  "Change font color": "文字色を変更",
  "Change background color": "背景色を変更",

  "Justify text": "両端揃え",
  "Align text left": "左揃え",
  "Center text": "中央揃え",
  "Align text right": "右揃え",

  Callout: "コールアウト",

  Headings: "見出し",
  Edit: "編集",
  Quotes: "引用",
  "Markdown syntax": "Markdown記法",
  Lists: "リスト",
  Alignment: "文字揃え",
  Submenu: "サブメニュー",
  "Vertical split": "区切り線",
};
