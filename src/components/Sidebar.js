import React from "react";
import ReactDom from "react-dom";

import Meta from "./Meta";
import Editor from "./Editor";

import { searchAnnotations } from "../lib/search";

class Sidebar extends React.Component {
  state = {
    filteredAnnotations: null,
    query: ""
  };

  search(query) {
    const { annotations } = this.props;
    
    if (query) {
      console.time("annotations search");
      let filteredAnnotations = searchAnnotations(annotations, query);
      console.timeEnd("annotations search");
      this.setState({ filteredAnnotations });
    }
    else {
      this.setState({ filteredAnnotations: null });
    }
  }
  
  render() {
    let { importableAnnotationsNum, annotations, onSelectAnnotation, onChange, onDelete, activeAnnotationId, onClickTags, onImport } = this.props;
    const annotationsView = document.getElementById('annotationsView');
    if (this.state.filteredAnnotations) {
      let newFilteredAnnotations = [];
      
      for (let filteredAnnotation of this.state.filteredAnnotations) {
        let annotation = annotations.find(x => x.id === filteredAnnotation.id);
        if (annotation) {
          newFilteredAnnotations.push(annotation);
        }
      }
      
      annotations = newFilteredAnnotations;
    }
    
    if (annotationsView) {
      return ReactDom.createPortal(
        (
          <div>
            <div className="Sidebar-search">
              <div className="Sidebar-search-input">
                <input
                  type="text"
                  placeholder="Search.."
                  value={this.state.query}
                  onChange={(e) => {
                    this.setState({ query: e.target.value });
                    this.search(e.target.value);
                  }}
                />
              </div>
              <div className="Sidebar-search-clear" onClick={() => {
                this.setState({ query: "" });
                this.search();
              }}>X
              </div>
            </div>
            {/*<button*/}
            {/*  className="Sidebar-import"*/}
            {/*  onClick={onImport}*/}
            {/*>*/}
            {/*  Import annotations ({importableAnnotationsNum})*/}
            {/*</button>*/}
            {annotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className={`Sidebar-block ${annotation.external ? "Sidebar-block-external" : ""} ${annotation.id === activeAnnotationId ? "Sidebar-block-active" : ""}`}
                data-sidebar-id={annotation.id}
                onClick={() => {
                  onSelectAnnotation(annotation.id);
                }}
                // draggable={false}
                // onDragStart={(event)=> {
                //   // annotation.itemId = window.itemId;
                //   // event.dataTransfer.setData('zotero/annotation', JSON.stringify(annotation));
                //   // event.dataTransfer.setData('text/plain', JSON.stringify(annotation));
                // }}
              >
                <Meta
                  annotation={annotation}
                  onUpdate={(comment) => {
                    onChange({id: annotation.id, comment});
                  }}
                  onColorChange={(color) => {
                    onChange({id: annotation.id, color});
                  }}
                  onDelete={() => {
                    onDelete(annotation.id);
                  }}
    
                  onFocus={() => {
                  }}
                  onClickTags={onClickTags}
                  onChange={onChange}
                  onDragStart={(event) => {
                    annotation.itemId = window.itemId;
                    event.dataTransfer.setData('zotero/annotation', JSON.stringify(annotation));
                    event.dataTransfer.setData('text/plain', JSON.stringify(annotation));
                  }}
                />
              </div>
            ))}
          
          </div>
        ),
        annotationsView
      );
    }
    
    return null;
  }
}

export default Sidebar;
