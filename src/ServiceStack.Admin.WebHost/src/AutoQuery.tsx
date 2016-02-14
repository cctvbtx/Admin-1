﻿/// <reference path='../typings/main.d.ts'/>

import * as React from 'react';
import { render } from 'react-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Content from './Content';
import 'jquery';
import 'ss-utils';

export default class AutoQuery extends React.Component<any, any> {
    constructor(props?, context?) {
        super(props, context);
        this.state = {};

        $.getJSON("/autoquery/metadata", r =>
            this.setState({ metadata: $.ss.normalize(r, true), name: this.props.params.name }));
    }

    render() {
        return this.state.metadata
            ? <App metadata={this.state.metadata} name={this.props.params.name} />
            : null;
    }
}

class App extends React.Component<any, any> {
    constructor(props?, context?) {
        super(props, context);

        console.log(this.props.metadata);

        var operationNames = this.props.metadata.operations.map(op => op.request);

        var viewerArgs = {}, operations = {}, types = {};
        operationNames.forEach(name => {
            viewerArgs[name] = {};
            var aqViewer = this.getAutoQueryViewer(name);
            if (aqViewer && aqViewer.args) {
                aqViewer.args.forEach(arg => viewerArgs[name][arg.name] = arg.value);
            }

            operations[name] = this.props.metadata.operations.filter(op => op.request === name)[0];
        });

        this.props.metadata.types.forEach(t => types[t.name] = t);

        this.state = {
            sidebarHidden: false, selected: null, defaults: {},
            operationNames, viewerArgs, operations, types            
        };
    }

    toggleSidebar() {
        this.setState({ sidebarHidden: !this.state.sidebarHidden });
    }

    getType(name: string) {
        return this.props.metadata.types.filter(op => op.name === name)[0];
    }

    getAutoQueryViewer(name: string) {
        const type = this.getType(name);
        return type != null && type.attributes != null
            ? type.attributes.filter(attr => attr.name === "AutoQueryViewer")[0]
            : null;
    }

    getAutoQueryViewerArgValue(name: string, argName:string) {
        var aqViewer = this.getAutoQueryViewer(name);
        var arg = aqViewer
            ? aqViewer.args.filter(x => x.name === argName)[0]
            : null;
        return arg != null
            ? arg.value
            : null;
    }

    getTitle(selected) {
        return selected
            ? this.getAutoQueryViewerArgValue(selected.name, 'Title') || selected.name
            : null;
    }

    getDefaults(name) {
        const viewerArgs = this.state.viewerArgs[name] || {};
        const op = this.state.defaults[name] || {};
        return Object.assign({
            searchField: viewerArgs["DefaultSearchField"] || "",
            searchType: viewerArgs["DefaultSearchType"] || "",
            searchText: viewerArgs["DefaultSearchText"]
        }, op);
    }

    getSelected(name) {
        const operation = this.state.operations[name];
        if (operation == null)
            return null;
        const requestType = this.state.types[name];
        const fromType = this.state.types[operation.from];
        const toType = this.state.types[operation.to];
        return { name, operation, requestType, fromType, toType};
    }

    onContentChange(name, newValues) {
        const defaults = this.state.defaults;
        const op = defaults[name] || (defaults[name] = {});

        Object.keys(newValues).forEach(k => {
            if (newValues[k] != null)
                op[k] = newValues[k];
        });

        this.setState({ defaults });
    }

    render() {
        var selected = this.getSelected(this.props.name);
        var opName = selected && selected.name;
        return (
            <div style={{ height: '100%' }}>
                <Header title={this.getTitle(selected)} onSidebarToggle={e => this.toggleSidebar() } />
                <div id="body" style={{ display:'flex', height:'100%' }}>
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
                        <Sidebar hide={this.state.sidebarHidden} name={opName}                        
                            viewerArgs={this.state.viewerArgs}
                            operations={this.state.operations}
                            />
                        <Content
                            config={this.props.metadata.config}
                            selected={selected}
                            defaults={this.getDefaults(this.props.name) }
                            conventions={this.props.metadata.config.implicitconventions}
                            viewerArgs={this.state.viewerArgs[opName]}
                            onChange={args => this.onContentChange(opName, args) }
                            />
                    </div>
                </div>
            </div>
        );
    }
}