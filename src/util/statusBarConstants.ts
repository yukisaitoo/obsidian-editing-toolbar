import { requireApiVersion } from "obsidian";
import { editingToolbarSettings } from "src/settings/settingsData";

let activeDocument: Document;

export const setMenuVisibility = (cMenuVisibility: boolean) => {
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  
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
  
  // Also check for legacy ID-based toolbar (backward compatibility)
  const legacyToolbar = activeDocument.getElementById("editingToolbarModalBar");
  if (legacyToolbar) {
    if (cMenuVisibility) {
      legacyToolbar.style.display = "";
      legacyToolbar.style.visibility = "visible";
    } else {
      legacyToolbar.style.display = "none";
    }
  }
};

export const setBottomValue = (
  settings: editingToolbarSettings
) => {
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  activeDocument.documentElement.style.setProperty('--toolbar-vertical-offset', `${settings.verticalPosition}px`);


};
export const setHorizontalValue = (settings: editingToolbarSettings) =>{
  requireApiVersion("0.15.0")?activeDocument=activeWindow.document:activeDocument=window.document;
  activeDocument.documentElement.style.setProperty('--toolbar-horizontal-offset', `${settings.horizontalPosition}px`);
}

