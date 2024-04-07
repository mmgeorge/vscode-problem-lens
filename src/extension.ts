import { CancellationToken, CodeLens, CodeLensProvider, Diagnostic, DiagnosticSeverity, Event, ExtensionContext, Position, ProviderResult, Range, Selection, TextDocument, Uri, commands, languages, window, workspace } from "vscode";

export function activate(context: ExtensionContext) {
  let cmds = [
    commands.registerCommand('problem-lens.gotoNextError', () => gotoProblem("next", new Set([
      DiagnosticSeverity.Error,
    ]))),
    commands.registerCommand('problem-lens.gotoNextWarning', () => gotoProblem("next", new Set([
      DiagnosticSeverity.Warning,
    ]))),
    commands.registerCommand('problem-lens.gotoNextWarningOrInformation', () => gotoProblem("next", new Set([
      DiagnosticSeverity.Warning,
      DiagnosticSeverity.Information,
    ]))),
    commands.registerCommand('problem-lens.gotoNextErrorOrWarning', () => gotoProblem("next", new Set([
      DiagnosticSeverity.Error,
      DiagnosticSeverity.Warning,
    ]))),
    commands.registerCommand('problem-lens.gotoNextProblem', () => gotoProblem("next", new Set([
      DiagnosticSeverity.Error,
      DiagnosticSeverity.Warning,
      DiagnosticSeverity.Information,
    ]))),

    commands.registerCommand('problem-lens.gotoPreviousError', () => gotoProblem("previous", new Set([
      DiagnosticSeverity.Error,
    ]))),
    commands.registerCommand('problem-lens.gotoPreviousWarning', () => gotoProblem("previous", new Set([
      DiagnosticSeverity.Warning,
    ]))),
    commands.registerCommand('problem-lens.gotoPreviousWarningOrInformation', () => gotoProblem("previous", new Set([
      DiagnosticSeverity.Warning,
      DiagnosticSeverity.Information,
    ]))),
    commands.registerCommand('problem-lens.gotoPreviousErrorOrWarning', () => gotoProblem("previous", new Set([
      DiagnosticSeverity.Error,
      DiagnosticSeverity.Warning,
    ]))),
    commands.registerCommand('problem-lens.gotoPreviousProblem', () => gotoProblem("previous", new Set([
      DiagnosticSeverity.Error,
      DiagnosticSeverity.Warning,
      DiagnosticSeverity.Information,
    ]))),


  ];

  context.subscriptions.push(...cmds);
  // context.subscriptions.push(
  //   languages.registerCodeLensProvider("*", new ProblemCodeLensProvider())
  // );
}

export function deactivate() { }

// class ProblemCodeLensProvider implements CodeLensProvider {
//   provideCodeLenses(document: TextDocument, token: CancellationToken): ProviderResult<CodeLens[]> {
//     let line = new Position(2, 30); // Top of the document
//     let range = new Range(line, new Position(2, 30));

//     const lens = new CodeLens(range, {
//       title: "Property value does not exist on type",
//       command: "",
//     });

//     return [lens];
//   }

//   // onDidChangeCodeLenses?: Event<void> | undefined;
//   // resolveCodeLens?(codeLens: CodeLens, token: CancellationToken): ProviderResult<CodeLens> {}
// }

function gotoProblem(direction: "previous" | "next", severityTypes: Set<DiagnosticSeverity>) {
  const editor = window.activeTextEditor;
  if (editor == null) {
    return;
  }

  const diagnostic = getClosestDiagnostic(severityTypes, direction);
  if (diagnostic) {
    editor.revealRange(diagnostic.range);
    editor.selection = new Selection(
      diagnostic.range.start,
      diagnostic.range.start
    );
  }
}

function getClosestDiagnostic(severityTypes: Set<DiagnosticSeverity>, direction: "previous" | "next"): Diagnostic | null {
  const editor = window.activeTextEditor;
  if (editor == null) {
    return null;;
  }

  const uri = editor.document.uri;
  const position = editor.selection.start;
  const diagnostics = languages.getDiagnostics(uri);
  const checkDirection = direction === "next" ?
    (diag: Diagnostic) => diag.range.start.isAfterOrEqual(position) :
    (diag: Diagnostic) => diag.range.start.isBeforeOrEqual(position);

  return closestDiagnosticFromPosition(position, diagnostics, uri, (diag) =>
    checkDirection(diag) && severityTypes.has(diag.severity)
  );
}

function closestDiagnosticFromPosition(
  position: Position,
  diagnostics: Diagnostic[],
  uri: Uri,
  predicate: (diagnostic: Diagnostic) => boolean
): Diagnostic | null {
  let closest = null;
  let minLineDist = Infinity;
  let minCharDist = Infinity;

  for (const diagnostic of diagnostics) {
    // Skip any currently selected diagnostic
    if (diagnostic.range.contains(position)) {
      continue;
    }

    const start = diagnostic.range.start;
    if (!predicate(diagnostic)) {
      continue;
    }

    const diagLineDist = Math.abs(start.line - position.line);
    const diagCharDist = Math.abs(start.character - position.character);

    if (diagLineDist < minLineDist) {
      minLineDist = diagLineDist;
      minCharDist = diagCharDist;
      closest = diagnostic;
      continue;
    }

    // Two problems on the same line, compare characters
    if (diagLineDist === minLineDist) {
      if (diagCharDist <= minCharDist) {
        minLineDist = diagLineDist;
        minCharDist = diagCharDist;
        closest = diagnostic;
      }
    }
  }

  return closest;
}