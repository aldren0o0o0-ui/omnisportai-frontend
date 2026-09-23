const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const FILE_PATH = 'src/pages/coordinator/Schedules.jsx';
const OUT_PATH = 'src/components/schedule/modals/PreflightModal.jsx';

const code = fs.readFileSync(FILE_PATH, 'utf-8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx']
});

let preflightModalPath = null;
let undefinedVars = new Set();

traverse(ast, {
  JSXElement(path) {
    const opening = path.node.openingElement;
    if (opening.name.name === 'AppModal') {
      const titleAttr = opening.attributes.find(
        attr => attr.name && attr.name.name === 'title' && attr.value && attr.value.value === 'AI Schedule Preflight'
      );
      if (titleAttr) {
        preflightModalPath = path;
        
        // Find all referenced identifiers that are not declared inside this modal
        path.traverse({
          Identifier(idPath) {
            // Ignore object properties, JSX closing tags, etc.
            if (
              idPath.parentPath.isMemberExpression() && idPath.parentPath.node.property === idPath.node && !idPath.parentPath.node.computed ||
              idPath.parentPath.isJSXClosingElement() ||
              idPath.parentPath.isJSXAttribute() && idPath.parentPath.node.name === idPath.node ||
              idPath.parentPath.isObjectProperty() && idPath.parentPath.node.key === idPath.node
            ) {
              return;
            }
            // Check if it's bound in the modal scope
            if (!idPath.scope.hasBinding(idPath.node.name, /* noGlobals */ true)) {
              // But it might be bound in the parent scope, which means it's a prop we need
              undefinedVars.add(idPath.node.name);
            }
          }
        });
      }
    }
  }
});

if (preflightModalPath) {
  // Common React/browser globals to exclude
  const globals = new Set(['console', 'window', 'document', 'Math', 'Date', 'Set', 'Map', 'Array', 'String', 'Number', 'Boolean', 'Object', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'alert', 'confirm', 'prompt', 'Intl', 'event']);
  
  const propsToPass = Array.from(undefinedVars).filter(v => !globals.has(v) && v !== 'AppModal' && v !== 'AlertTriangle' && v !== 'Info' && v !== 'CheckCircle2' && v !== 'MapPin' && v !== 'React');
  
  console.log('Props to pass:', propsToPass);

  const modalCode = generator(preflightModalPath.node).code;
  
  const componentCode = `import React from 'react';
import AppModal from "../../../components/common/AppModal";
import { AlertTriangle, CheckCircle2, Info, MapPin } from "lucide-react";

export default function PreflightModal({
  ${propsToPass.join(',\n  ')}
}) {
  return (
    ${modalCode}
  );
}
`;

  fs.writeFileSync(OUT_PATH, componentCode);
  console.log('Extracted to', OUT_PATH);

  // Replace in original AST
  const propsAttributes = propsToPass.map(prop => 
    t.jsxAttribute(t.jsxIdentifier(prop), t.jsxExpressionContainer(t.identifier(prop)))
  );
  
  const newElement = t.jsxElement(
    t.jsxOpeningElement(t.jsxIdentifier('PreflightModal'), propsAttributes, true),
    null,
    [],
    true
  );
  
  preflightModalPath.replaceWith(newElement);

  // Add import to top
  const importDecl = t.importDeclaration(
    [t.importDefaultSpecifier(t.identifier('PreflightModal'))],
    t.stringLiteral('../../components/schedule/modals/PreflightModal')
  );
  ast.program.body.unshift(importDecl);
  
  const newSchedulesCode = generator(ast).code;
  fs.writeFileSync(FILE_PATH, newSchedulesCode);
  console.log('Updated Schedules.jsx');

} else {
  console.log('Could not find PreflightModal in AST.');
}
