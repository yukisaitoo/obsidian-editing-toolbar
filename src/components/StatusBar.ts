import { Menu, setIcon } from "obsidian";
import { CommandPicker, openSlider } from "src/modals/suggesterModals";
import type EditingToolbarPlugin from "src/plugin/main";
import { resolveNextPositionStyle } from "src/settings/settingsData";
import { strings } from "src/translations/helper";

export class StatusBar {
  private plugin: EditingToolbarPlugin;
  private statusBarIcon!: HTMLElement;

  constructor(plugin: EditingToolbarPlugin) {
    this.plugin = plugin;
  }

  public init(): void {
    this.statusBarIcon = this.plugin.addStatusBarItem();
    this.statusBarIcon.addClass("editingToolbar-statusbar-button");
    setIcon(this.statusBarIcon, "editingToolbar");
    this.registerClickEvent();
  }

  private registerClickEvent(): void {
    this.plugin.registerDomEvent(this.statusBarIcon, "click", () => {
      const parent = this.statusBarIcon.parentElement;
      if (!parent) return;
      const statusBarRect = parent.getBoundingClientRect();
      const statusBarIconRect = this.statusBarIcon.getBoundingClientRect();
      this.showMenu(statusBarIconRect, statusBarRect);
    });
  }

  private showMenu(iconRect: DOMRect, barRect: DOMRect): void {
    const menu = new Menu();
    
    menu.addSections(["settings"]);
    this.addToolbarPositionToggle(menu);

    menu.addSections(["controls"]);
    this.addToolbarControls(menu);

    const menuDom = (menu as any).dom as HTMLElement;
    menuDom.addClass("editingToolbar-statusbar-menu");

    menu.showAtPosition({
      x: iconRect.right + 5,
      y: barRect.top - 5,
    });
  }

  private addToolbarPositionToggle(menu: Menu): void {
    menu.addItem((item) => {
      item.setTitle(strings.toolbarPosition);
      item.setSection("settings");
      item.setIcon("dock");

      const submenu = item.setSubmenu();

      submenu.addItem((subItem) => {
        subItem.setTitle(strings.topToolbar);
        subItem.setChecked(this.plugin.settings.enableTopToolbar || false);

        subItem.onClick(async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const s = this.plugin.settings;
          const prevStyle = this.plugin.positionStyle;
          s.enableTopToolbar = !s.enableTopToolbar;
          subItem.setChecked(s.enableTopToolbar);
          const nextStyle = resolveNextPositionStyle(s, 'top', s.enableTopToolbar, prevStyle);
          if (nextStyle && nextStyle !== prevStyle) {
            this.plugin.onPositionStyleChange(nextStyle);
          }
          await this.plugin.saveSettings();
          this.plugin.handleEditingToolbar();
        });
      });

      submenu.addItem((subItem) => {
        subItem.setTitle(strings.followingToolbar);
        subItem.setChecked(this.plugin.settings.enableFollowingToolbar || false);

        subItem.onClick(async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const s = this.plugin.settings;
          const prevStyle = this.plugin.positionStyle;
          s.enableFollowingToolbar = !s.enableFollowingToolbar;
          subItem.setChecked(s.enableFollowingToolbar);
          const nextStyle = resolveNextPositionStyle(s, 'following', s.enableFollowingToolbar, prevStyle);
          if (nextStyle && nextStyle !== prevStyle) {
            this.plugin.onPositionStyleChange(nextStyle);
          }
          await this.plugin.saveSettings();
          this.plugin.handleEditingToolbar();
        });
      });

      submenu.addItem((subItem) => {
        subItem.setTitle(strings.fixedToolbar);
        subItem.setChecked(this.plugin.settings.enableFixedToolbar || false);

        subItem.onClick(async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const s = this.plugin.settings;
          const prevStyle = this.plugin.positionStyle;
          s.enableFixedToolbar = !s.enableFixedToolbar;
          subItem.setChecked(s.enableFixedToolbar);
          const nextStyle = resolveNextPositionStyle(s, 'fixed', s.enableFixedToolbar, prevStyle);
          if (nextStyle && nextStyle !== prevStyle) {
            this.plugin.onPositionStyleChange(nextStyle);
          }
          await this.plugin.saveSettings();
          this.plugin.handleEditingToolbar();
        });
      });
    });
  }

  private addToolbarControls(menu: Menu): void {
    const controls = [
      {
        icon: "plus",
        title: strings.addCommand,
        click: () => new CommandPicker(this.plugin).open()
      }
    ];

    if (this.plugin.positionStyle === "fixed") {
      controls.push({
        icon: "file-sliders",
        title: strings.positionSettings,
        click: () => new openSlider(this.plugin.app, this.plugin).open()
      });
    }

    controls.forEach(control => {
      menu.addItem((item) => {
        item.setIcon(control.icon);
        item.setTitle(control.title);
        item.onClick(control.click);
        item.setSection("controls");
      });
    });
  }
} 