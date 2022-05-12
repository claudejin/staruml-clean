// getUnusedElements(elem, viewref)
//   : Find unused elements recursively
function getUnusedElements(elem, viewref) {
  let unusedElements = [];
  let viewCount = (viewref.includes(elem) ? 1 : 0);
  
  var addChildren = function(children) {
    for (let c in children) {
      [unusedChildren, childrenViewCount] = getUnusedElements(children[c], viewref);
      unusedElements = unusedElements.concat(unusedChildren);
      viewCount += childrenViewCount;
    }
  };
  
  addChildren(elem.ownedElements);
  addChildren(elem.nodes);
  addChildren(elem.groups);
  addChildren(elem.edges);
  
  // View count should be zero
  if (viewCount === 0)
  {
    // if it is a UML diagram, then it should have no views on it
    if (elem instanceof type.UMLDiagram === false || elem.ownedViews.length === 0)
      unusedElements.push(elem);
  }
  
  return [unusedElements, viewCount];
}

// getFullName(elem)
//   : Get the full name with its parent's name
function getFullName(elem) {
  // The top most project will not be considered
  if (elem instanceof type.Project)
    return "";

  let fullname = getFullName(elem._parent);
  if (fullname !== "")
      fullname += "::";
  fullname += elem.name;
  
  return fullname;
}

// handleShowUnusedElements()
//   : This is the function called when user clicks the menu or presses shorcut keys
function handleShowUnusedElements() {
  // Get the unique list of views in the project
  // Ref) https://www.javascripttutorial.net/array/javascript-remove-duplicates-from-array/
  const myviews = app.repository.select("@View.model");
  const uniqueViews = myviews.filter((c, index) => { return myviews.indexOf(c) === index; });
  console.log("Views: ", uniqueViews.length, uniqueViews);
  
  // Get the unused elements starting from the project
  // Ref) https://docs.staruml.io/developing-extensions/accessing-elements
  // Ref) https://stackoverflow.com/questions/46775128/how-can-i-ignore-certain-returned-values-from-array-destructuring
  const project = app.project.getProject();
  [unusedElems,] = getUnusedElements(project, uniqueViews);
  console.log("Unused elems: ", unusedElems.length, unusedElems);
  
  // If there are no unused elements, then alert and exit
  if (unusedElems.length === 0)
  {
      app.dialogs.showInfoDialog("There are no unused elements!");
      return;
  }
  
  // Show a dialog to list the unused
  var dlg = app.elementListPickerDialog.showDialog("Select an unused element to remove", unusedElems).then(function ({buttonId, returnValue}) {
    if (buttonId !== 'ok')
      return; // early return
    
	// if element is not specified, then remove all
    if (returnValue === null)
    {
      let namelist = unusedElems[0].name + " (" + getFullName(unusedElems[0]) + ")";
      for (let c in unusedElems)
      {
        if (c > 0)
          namelist = namelist + "\n" + unusedElems[c].name + " (" + getFullName(unusedElems[c]) + ")";
      }
      
	  const buttonIdConfirm = app.dialogs.showConfirmDialog("Do you want to remove all these element?\n\n" + namelist);
      if (buttonIdConfirm === 'ok')
        app.engine.deleteElements(unusedElems, []);
    }
    else
    {
      // Make the element selected in Model Explorer
      app.modelExplorer.select(returnValue, true);
	  
	  // Use setTimeout(500ms) to give some time to show the selection in Model Explorer
      setTimeout(function() {
        const buttonIdConfirm = app.dialogs.showConfirmDialog("Do you want to remove this element?\n\n" + returnValue.name + " (" + getFullName(returnValue) + ")");
        if (buttonIdConfirm === 'ok')
          app.engine.deleteElements([returnValue], []);
      }, 500);
    }
  });
}

function init() {
  app.commands.register(
    "clean:show-unused-elements",
    handleShowUnusedElements,
    "Clean"
  );
}

exports.init = init;
