import { Setting } from "obsidian";
import { ImportExportModal } from "src/modals/ImportExportModal";
import type { SettingsTabContext } from "src/settings/settingsTab";
import { strings } from "src/translations/helper";

export function renderImportExportTab(
  ctx: SettingsTabContext,
  containerEl: HTMLElement,
): void {
  containerEl.createDiv("import-export-warning").createEl("p", {
    text: strings.warningImportingConfigurationOverwriteCurren,
    cls: "warning-text",
  });

  const importExportContainer = containerEl.createDiv(
    "import-export-container",
  );
  new Setting(importExportContainer)
    .setName(strings.exportConfiguration)
    .setDesc(strings.exportToolbarConfigurationShareOthers)
    .addButton((button) =>
      button
        .setButtonText(strings.export)
        .setCta()
        .onClick(() => {
          new ImportExportModal(ctx.app, ctx.plugin, "export").open();
        }),
    );
  new Setting(importExportContainer)
    .setName(strings.importConfiguration)
    .setDesc(strings.importToolbarConfigurationJson)
    .addButton((button) =>
      button
        .setButtonText(strings.import)
        .setCta()
        .onClick(() => {
          new ImportExportModal(ctx.app, ctx.plugin, "import").open();
        }),
    );

  const infoDiv = containerEl.createDiv("import-export-info");
  infoDiv.createEl("h3", {
    text: strings.usageInstructions,
    cls: "import-export-heading",
  });

  const ul = infoDiv.createEl("ul");
  ul.createEl("li", { text: strings.exportGenerateJsonConfigurationCan });
  ul.createEl("li", { text: strings.importPastePreviouslyExportedJson });
}
