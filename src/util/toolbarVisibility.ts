import { editingToolbarSettings } from "src/settings/settingsData";

export const setMenuVisibility = (cMenuVisibility: boolean) => {
  const activeDocument = activeWindow.document;

  // Hide all toolbar styles (top, following, fixed)
  const toolbarStyles = ["top", "following", "fixed"];
  toolbarStyles.forEach((style) => {
    const toolbars = activeDocument.querySelectorAll(
      `.editingToolbarModalBar[data-toolbar-style="${style}"]`
    );
    toolbars.forEach((toolbar) => {
      if (cMenuVisibility) {
        (toolbar as HTMLElement).style.display = "";
        (toolbar as HTMLElement).style.visibility = "visible";
      } else {
        (toolbar as HTMLElement).style.display = "none";
      }
    });
  });
};

export const setBottomValue = (settings: editingToolbarSettings) => {
  const activeDocument = activeWindow.document;
  activeDocument.documentElement.style.setProperty(
    "--toolbar-vertical-offset",
    `${settings.verticalPosition}px`
  );
};

export const setHorizontalValue = (settings: editingToolbarSettings) => {
  const activeDocument = activeWindow.document;
  activeDocument.documentElement.style.setProperty(
    "--toolbar-horizontal-offset",
    `${settings.horizontalPosition}px`
  );
};
