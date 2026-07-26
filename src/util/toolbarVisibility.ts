import { closeMoreOverflowPopovers } from "src/toolbar/editingToolbar";

export const setMenuVisibility = (cMenuVisibility: boolean) => {
  const activeDocument = activeWindow.document;

  // The » popover is a sibling of the bar, so hiding the bar alone would leave
  // it floating over the note.
  if (!cMenuVisibility) closeMoreOverflowPopovers(activeDocument);

  const toolbarStyles = ["top", "following"];
  toolbarStyles.forEach((style) => {
    const toolbars = activeDocument.querySelectorAll(
      `.editingToolbarModalBar[data-toolbar-style="${style}"]`,
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
