import { ItemView, Menu, requireApiVersion, setIcon, ToggleComponent } from "obsidian";
import { selfDestruct } from "src/modals/editingToolbarModal";
import { CommandPicker, openSlider } from "src/modals/suggesterModals";
import type EditingToolbarPlugin from "src/plugin/main";
import { AESTHETIC_STYLES, getAppearanceValue, resolveNextPositionStyle, setAppearanceValue } from "src/settings/settingsData";
import { strings } from "src/translations/helper";
import { setMenuVisibility } from "src/util/statusBarConstants";
import { ViewUtils } from "src/util/viewUtils";

export class StatusBar {
  private plugin: EditingToolbarPlugin;
  private statusBarIcon: HTMLElement;

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
      const statusBarRect = this.statusBarIcon.parentElement.getBoundingClientRect();
      const statusBarIconRect = this.statusBarIcon.getBoundingClientRect();
      this.showMenu(statusBarIconRect, statusBarRect);
    });
  }

  private showMenu(iconRect: DOMRect, barRect: DOMRect): void {
    const menu = new Menu();
    
    menu.addSections(["settings"]);
    this.addVisibilityToggle(menu);

    this.addAestheticStyleToggle(menu);
    menu.addSections(["viewType"]);
    this.addViewTypeToggle(menu);
    menu.addSections(["controls"]);
    this.addToolbarControls(menu);

    const menuDom = (menu as any).dom as HTMLElement;
    menuDom.addClass("editingToolbar-statusbar-menu");

    menu.showAtPosition({
      x: iconRect.right + 5,
      y: barRect.top - 5,
    });
  }

  private addVisibilityToggle(menu: Menu): void {
    menu.addItem((item) => {
      item.setTitle(strings.hideShow);
      if (requireApiVersion("0.15.0")) item.setSection("settings");
      const itemDom = (item as any).dom as HTMLElement;
      const toggleComponent = new ToggleComponent(itemDom)
        .setValue(this.plugin.settings.cMenuVisibility)
        .setDisabled(true);

      const toggle = async () => {
        this.plugin.settings.cMenuVisibility = !this.plugin.settings.cMenuVisibility;
        toggleComponent.setValue(this.plugin.settings.cMenuVisibility);
        this.plugin.settings.cMenuVisibility == true
          ? setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100)
          : setMenuVisibility(this.plugin.settings.cMenuVisibility);
        selfDestruct(this.plugin);
        await this.plugin.saveSettings();
      };

      item.onClick((e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        toggle();
      });
    });

    menu.addItem((item) => {
      item.setTitle(strings.toolbarPosition);
      if (requireApiVersion("0.15.0")) item.setSection("settings");
      item.setIcon("dock");

      const submenu = item.setSubmenu();

      submenu.addItem((subItem) => {
        subItem.setTitle(strings.topToolbar);
        const itemDom = (subItem as any).dom as HTMLElement;
        const toggleComponent = new ToggleComponent(itemDom)
          .setValue(this.plugin.settings.enableTopToolbar || false)
          .setDisabled(true);

        subItem.onClick(async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const s = this.plugin.settings;
          const prevStyle = this.plugin.positionStyle;
          s.enableTopToolbar = !s.enableTopToolbar;
          toggleComponent.setValue(s.enableTopToolbar);
          const nextStyle = resolveNextPositionStyle(s, 'top', s.enableTopToolbar, prevStyle);
          if (nextStyle && nextStyle !== prevStyle) {
            this.plugin.onPositionStyleChange(nextStyle);
          }
          await this.plugin.saveSettings();
          this.plugin.handleeditingToolbar();
        });
      });

      submenu.addItem((subItem) => {
        subItem.setTitle(strings.followingToolbar);
        const itemDom = (subItem as any).dom as HTMLElement;
        const toggleComponent = new ToggleComponent(itemDom)
          .setValue(this.plugin.settings.enableFollowingToolbar || false)
          .setDisabled(true);

        subItem.onClick(async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const s = this.plugin.settings;
          const prevStyle = this.plugin.positionStyle;
          s.enableFollowingToolbar = !s.enableFollowingToolbar;
          toggleComponent.setValue(s.enableFollowingToolbar);
          const nextStyle = resolveNextPositionStyle(s, 'following', s.enableFollowingToolbar, prevStyle);
          if (nextStyle && nextStyle !== prevStyle) {
            this.plugin.onPositionStyleChange(nextStyle);
          }
          await this.plugin.saveSettings();
          this.plugin.handleeditingToolbar();
        });
      });

      submenu.addItem((subItem) => {
        subItem.setTitle(strings.fixedToolbar);
        const itemDom = (subItem as any).dom as HTMLElement;
        const toggleComponent = new ToggleComponent(itemDom)
          .setValue(this.plugin.settings.enableFixedToolbar || false)
          .setDisabled(true);

        subItem.onClick(async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const s = this.plugin.settings;
          const prevStyle = this.plugin.positionStyle;
          s.enableFixedToolbar = !s.enableFixedToolbar;
          toggleComponent.setValue(s.enableFixedToolbar);
          const nextStyle = resolveNextPositionStyle(s, 'fixed', s.enableFixedToolbar, prevStyle);
          if (nextStyle && nextStyle !== prevStyle) {
            this.plugin.onPositionStyleChange(nextStyle);
          }
          await this.plugin.saveSettings();
          this.plugin.handleeditingToolbar();
        });
      });
    });
  }

  private addViewTypeToggle(menu: Menu): void {
    const view = this.plugin.app.workspace.getActiveViewOfType(ItemView);
    if (!view) return;
    
    const viewType = view.getViewType();
    
    menu.addItem((item) => {
      item.setTitle(strings.currentView + viewType);
      if (requireApiVersion("0.15.0")) item.setSection("settings");
      item.setIcon("layout-template");
      
      const submenu = item.setSubmenu();
      
      const isAllowed = ViewUtils.isAllowedViewType(view);
      
      submenu.addItem(subItem => {
        subItem.setTitle(isAllowed ? strings.disableToolbarView : strings.enableToolbarView);
        subItem.setIcon(isAllowed ? "eye-off" : "eye");
        subItem.onClick(async () => {
          if (!this.plugin.settings.viewTypeSettings) {
            this.plugin.settings.viewTypeSettings = {};
          }
          
          this.plugin.settings.viewTypeSettings[viewType] = !isAllowed;
          
          await this.plugin.saveSettings();

          selfDestruct(this.plugin);
          setTimeout(() => {
            dispatchEvent(new Event("editingToolbar-NewCommand"));
          }, 100);
        });
      });
      
      submenu.addItem(subItem => {
        subItem.setTitle(strings.manageAllViewTypes);
        subItem.setIcon("settings-2");
        
        const allViewsSubmenu = subItem.setSubmenu();
        
        const defaultViewTypes = [
          'markdown',
          'canvas',
          'thino_view',
          'meld-encrypted-view',
        ];
        
        const knownViewTypes = new Set([
          ...defaultViewTypes,
          ...Object.keys(this.plugin.settings.viewTypeSettings || {})
        ]);
        
        Array.from(knownViewTypes).sort().forEach(vType => {
          const isViewAllowed = this.isViewTypeAllowed(vType);
          
          allViewsSubmenu.addItem(viewItem => {
            viewItem.setTitle(vType);
            viewItem.setIcon(isViewAllowed ? "check" : "");
            viewItem.onClick(async () => {
              if (!this.plugin.settings.viewTypeSettings) {
                this.plugin.settings.viewTypeSettings = {};
              }
              
              this.plugin.settings.viewTypeSettings[vType] = !isViewAllowed;

              if (viewType === vType) {
                selfDestruct(this.plugin);
                setTimeout(() => {
                  dispatchEvent(new Event("editingToolbar-NewCommand"));
                }, 100);
              }
              
              await this.plugin.saveSettings();
            });
          });
        });
      });
    });
  }

  private isViewTypeAllowed(viewType: string): boolean {
    if (!this.plugin.settings.viewTypeSettings || 
        this.plugin.settings.viewTypeSettings[viewType] === undefined) {
      const defaultViewTypes = [
        'markdown',
        'canvas',
        'thino_view',
        'meld-encrypted-view',
      ];
      return defaultViewTypes.includes(viewType);
    }
    
    return this.plugin.settings.viewTypeSettings[viewType];
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

        if (requireApiVersion("0.15.0")) {
          item.setSection("controls");
        }
      });
    });
  }

  private addAestheticStyleToggle(menu: Menu): void {
    menu.addItem((item) => {
      item.setTitle(strings.appearanceStyle);
      if (requireApiVersion("0.15.0")) item.setSection("settings");
      item.setIcon("cherry");

      const submenu = item.setSubmenu();
      
      AESTHETIC_STYLES.forEach(style => {
        submenu.addItem(subItem => {
          subItem.setTitle(style);
          subItem.setIcon(getAppearanceValue(this.plugin.settings, "aestheticStyle", this.plugin.resolveActiveStyle()) === style ? "check" : "");
          subItem.onClick(async () => {
            setAppearanceValue(this.plugin.settings, "aestheticStyle", this.plugin.resolveActiveStyle(), style);
            await this.plugin.saveSettings();
            selfDestruct(this.plugin);
            setTimeout(() => {
              dispatchEvent(new Event("editingToolbar-NewCommand"));
            }, 100);
          });
        });
      });
    });
  }
} 