import { App, Command, FuzzyMatch, FuzzySuggestModal, Modal, Notice, SliderComponent, TextAreaComponent, TextComponent, debounce, setIcon } from "obsidian";
import { appIcons } from "src/icons/appIcons";
import type editingToolbarPlugin from "src/plugin/main";
import { strings, t } from "src/translations/helper";
import { setBottomValue, setHorizontalValue } from "src/util/statusBarConstants";
import { findmenuID } from "src/util/util";

type IconSelectCallback = (iconId: string) => void;

export class ChooseFromIconList extends FuzzySuggestModal<string> {
  plugin: editingToolbarPlugin;
  command: any;
  issub: boolean;
  currentEditingConfig:string;
  customCallback: IconSelectCallback | null = null;
  constructor(
    plugin: editingToolbarPlugin, 
    command: any, 
    issub: boolean = false,
    callback?: IconSelectCallback,
    currentEditingConfig?:string
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.command = command;
    this.issub = issub;
    this.customCallback = callback || null;
    this.setPlaceholder(strings.chooseIcon2);
    this.currentEditingConfig = currentEditingConfig || "";
  }

  private capitalJoin(string: string): string {
    const icon = string.split(" ");

    return icon
      .map((icon) => {
        return icon[0].toUpperCase() + icon.substring(1);
      })
      .join(" ");
  }

  getItems(): string[] {
    return appIcons;
  }

  getItemText(item: string): string {
    return this.capitalJoin(
      item
        .replace("feather-", "")
        .replace("remix-", "")
        .replace("bx-", "")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/-/gi, " ")
    );
  }

  renderSuggestion(icon: FuzzyMatch<string>, iconItem: HTMLElement): void {
    const span = createSpan({ cls: "editingToolbarIconPick" });
    iconItem.appendChild(span);
    setIcon(span, icon.item);
    super.renderSuggestion(icon, iconItem);
  }

  async onChooseItem(item: string): Promise<void> {
    if (item === "Custom") {
      if (this.customCallback) {
        new CustomIcon(
          this.app, 
          this.plugin, 
          { id: this.command.id, name: this.command.name, icon: "" }, 
          this.issub, 
          (customIconValue) => {
            this.customCallback(customIconValue);
          }
        ).open();
        return;
      } else {
        new CustomIcon(this.app, this.plugin, this.command, this.issub,null,this.currentEditingConfig).open();
        return;
      }
    }
    
    if (this.customCallback) {
      this.customCallback(item);
      return;
    }
    
    const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);
    if (this.command.icon) {
      let menuID = findmenuID(this.plugin, this.command, this.issub,currentCommands);
      if (this.issub) {
        currentCommands[menuID['index']].SubmenuCommands[menuID['subindex']].icon = item;
      } else {
        currentCommands[menuID['index']].icon = item;
      }
      this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
    } else {
      this.command.icon = item;
      currentCommands.push(this.command);
      this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
    }

    await this.plugin.saveSettings();
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
    console.log(
      `%c命令 '${this.command.name}' 已添加到编辑工具栏`,
      "color: Violet"
    );
  }
}

class CustomIcon extends Modal {
  plugin: editingToolbarPlugin;
  item: Command;
  issub: boolean;
  currentEditingConfig:string;
  submitEnterCallback: (this: HTMLTextAreaElement, ev: KeyboardEvent) => any;
  customCallback: IconSelectCallback | null = null;

  constructor(
    app: App, 
    plugin: editingToolbarPlugin, 
    item: Command, 
    issub: boolean,
    callback?: IconSelectCallback,
    currentEditingConfig?:string
  ) {
    super(app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.customCallback = callback || null;
    this.currentEditingConfig = currentEditingConfig || "";
    this.containerEl.addClass("editingToolbar-Modal");
    this.containerEl.addClass("customicon");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("b", { text: strings.enterIconCodeFormatSvg });
    
    const textComponent = document.createElement("textarea");
    textComponent.className = "wideInputPromptInputEl";
    textComponent.placeholder = "";
    textComponent.value = this.item.icon || '';
    textComponent.style.width = "100%";
    textComponent.style.height = "200px";
    contentEl.appendChild(textComponent);
    
    textComponent.addEventListener("input", async () => {
      const value = textComponent.value;
      
      if (this.customCallback) {
        this.item.icon = value;
        return;
      }

      this.item.icon = value;
      const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);
      const menuID = findmenuID(this.plugin, this.item, this.issub,currentCommands);
      
      if (!this.issub) {
        let index = menuID['index'];
        index === -1 
          ? this.plugin.settings.menuCommands.push(this.item) 
          : (this.plugin.settings.menuCommands[index].icon = this.item.icon);
      } else {
        let subindex = menuID['subindex'];
        subindex === -1 
          ? this.plugin.settings.menuCommands[menuID["index"]].SubmenuCommands.push(this.item) 
          : this.plugin.settings.menuCommands[menuID['index']].SubmenuCommands[subindex].icon = value;
      }
      
      await this.plugin.saveSettings();
    });
    
    if (this.submitEnterCallback) {
      textComponent.addEventListener('keydown', this.submitEnterCallback);
    }
  }
  
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    
    if (this.customCallback) {
      this.customCallback(this.item.icon || '');
    } else {
      setTimeout(() => {
        dispatchEvent(new Event("editingToolbar-NewCommand"));
      }, 100);
    }
  }
}


export class CommandPicker extends FuzzySuggestModal<Command> {
  command: Command;
  currentEditingConfig:string;
  constructor(private plugin: editingToolbarPlugin,currentEditingConfig?:string) {
    super(plugin.app);
    this.app;
    this.setPlaceholder(strings.chooseCommand);
    this.currentEditingConfig = currentEditingConfig || "";
  }

  getItems(): Command[] {
    //@ts-ignore
    return this.app.commands.listCommands();
  }

  getItemText(item: Command): string {
    return t(item.name as any);
  }

  async onChooseItem(item: Command): Promise<void> {
    
    const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);

    let index = currentCommands.findIndex((v) => v.id == item.id);

    if (index > -1)
    {
      new Notice(strings.command2 + t(item.name as any) + strings.alreadyExists, 3000);
      return;
    } else {
      if (item.icon) {
        currentCommands.push(item);
        this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
        await this.plugin.saveSettings();
        setTimeout(() => {
          dispatchEvent(new Event("editingToolbar-NewCommand"));
        }, 100);
        console.log(
          `%c命令 '${item.name}' 已添加到编辑工具栏`,
          "color: Violet"
        );
      } else {
        new ChooseFromIconList(this.plugin, item, false, null, this.currentEditingConfig).open();
      }
    }
  }
}

 


export class ChangeCmdname extends Modal {
  plugin: editingToolbarPlugin;
  item: Command;
  issub: boolean;
  currentEditingConfig:string;
  submitEnterCallback: (this: HTMLInputElement, ev: KeyboardEvent) => any;
  constructor(app: App, plugin: editingToolbarPlugin, item: Command, issub: boolean,currentEditingConfig?:string) {
    super(plugin.app);
    this.plugin = plugin;
    this.item = item;
    this.issub = issub;
    this.currentEditingConfig = currentEditingConfig || "";
    this.containerEl.addClass("editingToolbar-Modal");
    this.containerEl.addClass("changename");
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("b", { text: strings.pleaseEnterNewName });

    const textComponent = new TextComponent(contentEl);
    textComponent.inputEl.classList.add('InputPromptInputEl');
    textComponent.setPlaceholder("")
      .setValue(this.item.name ?? '')
      .onChange(debounce(async (value) => {
        const currentCommands = this.plugin.getCurrentCommands(this.currentEditingConfig);
        
        let menuID = findmenuID(this.plugin, this.item, this.issub,currentCommands)
        this.item.name = value;
        if (!this.issub)
        {
          let index = menuID['index']
          //  console.log(index,"index")
          if (index === -1) {
            currentCommands.push(this.item);
          } else {
            currentCommands[index].name = this.item.name;
          }
        } else {
          let subindex = menuID['subindex']
          if (subindex === -1) {
            currentCommands[menuID["index"]].SubmenuCommands.push(this.item);
          } else {
            currentCommands[menuID['index']].SubmenuCommands[subindex].name = value;
          }
        }
        
        this.plugin.updateCurrentCommands(currentCommands, this.currentEditingConfig);
        await this.plugin.saveSettings();
      }, 100, true))
      .inputEl.addEventListener('keydown', this.submitEnterCallback);
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
    setTimeout(() => {
      dispatchEvent(new Event("editingToolbar-NewCommand"));
    }, 100);
  }
};

export class openSlider extends Modal {
  plugin: editingToolbarPlugin;
  private needSave: boolean = false;

  constructor(app: App, plugin: editingToolbarPlugin) {
    super(plugin.app);
    this.plugin = plugin;
    this.containerEl.addClass("editingToolbar-Modal");
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("p", { text: strings.dragSliderMovePosition });

    const containerEl = contentEl.createDiv({ cls: "slider-container" });

    const verticalContainer = containerEl.createDiv({ cls: "vertical-slider-container" });
    verticalContainer.createEl("p", { text: strings.verticalPosition });

    const horizontalContainer = containerEl.createDiv({ cls: "horizontal-slider-container" });
    horizontalContainer.createEl("p", { text: strings.horizontalPosition });
      const columnsContainer = containerEl.createDiv({ cls: "columns-slider-container" });
      columnsContainer.createEl("p", { text: strings.editingToolbarColumns });
    const bodyHeight = document.body.clientHeight;
    const bodyWidth = document.body.clientWidth;

    const verticalMax = Math.floor(bodyHeight / 3);
    const verticalMin = -Math.floor(bodyHeight);
    const horizontalMax = Math.floor(bodyWidth / 2);
    const horizontalMin = -Math.floor(bodyWidth / 2);
    // let topem = (this.plugin.settings.cMenuBottomValue - 4.25)*5;
    const verticalSlider = new SliderComponent(verticalContainer)
      .setLimits(verticalMin, verticalMax, 5)
      .setValue(this.plugin.settings.verticalPosition || 0)
      .onChange(debounce((value) => {
        this.needSave = true;
        this.plugin.settings.verticalPosition = value;
        setBottomValue(this.plugin.settings);
      }, 100, true))
      .setDynamicTooltip();

    const horizontalSlider = new SliderComponent(horizontalContainer)
      .setLimits(horizontalMin, horizontalMax, 10)
      .setValue(this.plugin.settings.horizontalPosition || 0)
      .onChange(debounce((value) => {
        this.needSave = true;
        this.plugin.settings.horizontalPosition = value;
        setHorizontalValue(this.plugin.settings);
      }, 100, true))
      .setDynamicTooltip();
    const columnsSlider = new SliderComponent(columnsContainer)
      .setLimits(1, 32, 1)
      .setValue(this.plugin.settings.cMenuNumRows || 12)
      .onChange(debounce(async (value) => {
        this.needSave = true;
        this.plugin.settings.cMenuNumRows = value;
        await this.plugin.saveSettings();
        setTimeout(() => {
          dispatchEvent(new Event("editingToolbar-NewCommand"));
        }, 100);
      }, 100, true))
      .setDynamicTooltip();


    const resetContainer = containerEl.createDiv({ cls: "reset-container" });

    resetContainer.createEl("button", {
      text: strings.reset,
      cls: "reset-button"
    }).addEventListener("click", () => {
      this.needSave = true;
      verticalSlider.setValue(0);
      horizontalSlider.setValue(0);
      columnsSlider.setValue(12);
      this.plugin.settings.verticalPosition = 0;
      this.plugin.settings.horizontalPosition = 0;
      this.plugin.settings.cMenuNumRows = 12;
      setBottomValue(this.plugin.settings);
      setHorizontalValue(this.plugin.settings);

    });
  }

  async onClose() {
    const { contentEl } = this;
    contentEl.empty();

    if (this.needSave) {
      await this.plugin.saveSettings();
    }
  }
};
