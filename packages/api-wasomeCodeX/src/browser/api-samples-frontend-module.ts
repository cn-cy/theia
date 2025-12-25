// *****************************************************************************
// Copyright (C) 2019 Arm and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

import { ContainerModule, interfaces } from '@theia/core/shared/inversify';
import { bindSampleMenu } from './menu/sample-menu-contribution';
import { bindSampleToolbarContribution } from './toolbar/sample-toolbar-contribution';
import { FileSystemWatcherErrorHandler } from '@theia/filesystem/lib/browser/filesystem-watcher-error-handler';
import { LogOnlyFileSystemWatcherErrorHandler } from './file-watching/log-only-file-watcher-error-handler';

import '../../src/browser/style/branding.css';
import '../../src/browser/style/dialogs.css'
import '../../src/browser/style/importExportXml.css'

import { DefaultLocaleFrontendContribution } from './view/default-locale-contribution';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { bindWebviewViewStabilityPatch } from './webview/webview-view-stability-patch';
import { bindTreeViewPreparePatch } from './view/tree-view-prepare-patch';
import { bindTreeWidgetViewPatch } from './view/tree-widget-view-patch';

export default new ContainerModule((
    bind: interfaces.Bind,
    unbind: interfaces.Unbind,
    isBound: interfaces.IsBound,
    rebind: interfaces.Rebind,
) => {
    // TODO 新增IDE命令贡献，移除旧命令贡献
    bindSampleMenu(bind);
    bindSampleToolbarContribution(bind, rebind);
    // Custom: bind default locale (zh-hans) initializer
    bind(DefaultLocaleFrontendContribution).toSelf().inSingletonScope();
    rebind(FileSystemWatcherErrorHandler).to(LogOnlyFileSystemWatcherErrorHandler).inSingletonScope();
    bind(FrontendApplicationContribution).toService(DefaultLocaleFrontendContribution);
    // WebviewView stability (Scheme A) runtime patch.
    bindWebviewViewStabilityPatch(bind);
    bindTreeViewPreparePatch(bind);
    bindTreeWidgetViewPatch(bind);
});
