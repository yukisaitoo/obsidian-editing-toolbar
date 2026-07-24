// Português (Brasil)

import type { en } from "../en";

const ui: Partial<Record<keyof typeof en, string>> = {
  aiQuestionTemplate: "Modelo de pergunta para IA:",
  add: "Adicionar",
  addCommand: "Adicionar Comando",
  addCustomCommand: "Adicionar Comando Personalizado",
  addFormatCommand: "Adicionar formatação",
  addRegexCommand: "Adicionar regex",
  addSeparator: "Adicionar Separador",
  addSubmenu: "Adicionar Submenu",
  addCommandOntoEditingToolbar:
    "Adicione um comando na Barra de Ferramentas a partir da biblioteca de comandos do Obsidian. Para reordenar os comandos, arraste e solte os itens do comando. Para deletar, use o botão de deletar à direita do item do comando. A Barra de Ferramentas não atualizará automaticamente após reordenar os comandos. Use o botão de atualização acima.",
  addBoldKeywords: "Adicionar negrito a palavras-chave",
  addContentAfterSelectedText: "Adicionar conteúdo depois do texto selecionado",
  addContentBeforeSelectedText: "Adicionar conteúdo antes do texto selecionado",
  addListSymbolEachLine:
    "Adicionar símbolo de lista a cada linha (modo multilinha)",
  addRegularExpressionCommand: "Adicionar comando de expressão regular",
  addCommandToolbar: "Adicionar este comando à barra de ferramentas.",
  addToolbar: "Adicionar à Barra de Edição",
  addUniformAliasMarkdownLinks:
    "Adicionar um alias uniforme aos links Markdown",
  addEditDeleteCustomFormat:
    "Adicionar, editar ou deletar comandos de formatação personalizados.",
  allSettings: "Todas as Configurações",
  allToolbarCommands: "Todos os Comandos da Barra de Ferramentas",
  allCommandsHaveBeenRemoved: "Todos os comandos foram removidos.",
  appearance: "Aparência",
  applyRegularExpressionReplacement:
    "Aplicar substituição de expressão regular",
  clearAllFixedStyleCommands: "Limpar todos os Comandos de Estilo Fixo",
  clearAllFollowingStyleCommands:
    "Limpar todos os Comandos de Estilo Contextual",
  clearAllTopStyleCommands: "Limpar todos os Comandos de Estilo de Topo",
  commandAlreadyExistsSelectedConfigurations:
    "Comando já existe nas configurações selecionadas",
  commandDeployed: "Comando implantado para: ",
  copyCommandsAnotherStyleConfiguration:
    "Copiar comandos de outra configuração de estilo.",
  currentConfiguration: "Configuração Atual",
  currentlyEditingCommands: "Atualmente editando comandos para",
  deploy: "Implantar",
  deployCommandConfigurations: "Implantar comando para configurações",
  fixedStyleOnly: "Disponível apenas no modo fixo",
  followingStyleOnly: "Disponível apenas no modo contextual",
  import2: "Importar de",
  removeAllCommandsConfiguration:
    "Remover todos os comandos desta configuração.",
  sureWantClearAllCommands:
    "Tem certeza que deseja limpar todos os comandos sob o estilo atual?",
  backgroundColor: "Cor de Fundo",
  calloutType: "Tipo de Callout",
  cancel: "Cancelar",
  changeCommandName: "Alterar Nome do Comando",
  chooseIcon: "Escolha um ícone",
  chooseCommand: "Escolha um comando",
  chooseIcon2: "Escolha um ícone",
  chooseHowImportConfiguration: "Escolha como importar a configuração",
  chooseIcon3: "Escolha um ícone",
  chooseNumberColumnsPerRow:
    "Escolha o número de colunas por linha para exibir na Barra de Ferramentas.",
  chooseOffsetEditingToolbarFixed:
    "Escolha o deslocamento da Barra de Edição na posição fixa.",
  chooseWhatExport: "Escolha o que exportar",
  chooseWhichToolbarStyleS:
    "Escolha qual estilo de barra de ferramentas você deseja editar.",
  clear: "Limpar",
  clearAllCustomCommands: "Limpar todos os Comandos Personalizados",
  clearAllMainMenuCommands: "Limpar todos os Comandos do Menu Principal",
  clickPickerAdjustColor: "Clique no seletor para ajustar a cor",
  closed: "Fechado",
  collapseState: "Estado de Colapso",
  command: "Comando",
  commandDeleted: "Comando Deletado",
  commandId: "ID do Comando",
  commandIdCommandNameCannot:
    "ID do Comando e nome do comando não podem ser vazios",
  commandIdCannotContainSpaces: "ID do Comando não pode conter espaços",
  commandName: "Nome do Comando",
  commandIconClickSelect: "Ícone do comando (clique para selecionar)",
  completeRegularExpressionCodeCopy:
    "Código de expressão regular completo (copiar para explicação com IA)",
  conditionPattern: "Padrão de condição",
  conditionalMatching: "Ocorrência Condicional",
  configurationCopiedClipboard:
    "Configuração copiada para a área de transferência",
  configurationImportedSuccessfully: "Configuração importada com sucesso",
  confirm: "Confirmar",
  confirmDelete: "Confirmar Deleção?",
  content: "Conteúdo",
  convertHtmlBoldTagsMarkdown:
    "Converter tags HTML de negrito para negrito em Markdown",
  convertMmDdYyyyYyyy: "Converter MM/DD/YYYY para YYYY-MM-DD",
  convertQuotedTextQuoteBlock: "Converter texto citado para bloco de citação",
  copied: "Copiado!",
  copyCode: "Copiar código",
  copyClipboard: "Copiar para a área de transferência",
  currentLineEmptyPleaseSelect:
    "A linha atual está vazia, por favor selecione o texto ou mova para uma linha não vazia",
  cursorPositionOffset: "Deslocamento do cursor",
  customBackgroundColor: "Cor de Fundo Personalizada",
  customCommands: "Comandos Personalizados",
  customCommandsOnly: "Apenas Comandos Personalizados",
  customFontColor: "Cor de Texto Personalizada",
  customFontColors: "Cores de Fonte Personalizadas",
  customColors: "Cores Personalizadas",
  switchBetweenDifferentCommandConfigurations:
    "Trocar entre configurações de comando diferentes.",
  themeColors: "Cores do Tema",
  standardColors: "Cores Padrão",
  topStyleOnly: "Disponível apenas no modo de topo",
  translucentColors: "Cores Translúcidas",
  highlighterColors: "Cores de Marca-Texto",
  customTheme: "Estilo Personalizado",
  default: "Padrão",
  default0FormatKeepText: "Padrão 0, o formato manterá o texto selecionado",
  delete: "Deletar",
  deleteEmptyLinesMultilineMode: "Deletar linhas vazias (modo multilinha)",
  displayedNameToolbarMenu: "Nome exibido na barra de ferramentas e menu",
  doWantContinue: "Deseja continuar?",
  dragSliderMovePosition: "Arraste o slider para mover a posição",
  edit: "Editar",
  editCustomCommand: "Editar Comando Personalizado",
  editRegularExpressionCommand: "Editar comando de expressão regular",
  editingToolbarCentredDisplay: "Exibição Centralizada da Barra de Ferramentas",
  editingToolbarColumns: "Colunas da Barra de Ferramentas",
  editingToolbarCommands: "Comandos da Barra de Ferramentas",
  embedContent: "Conteúdo Embutido",
  enable: "Habilitar",
  enableToolbarPositionedTop:
    "Habilitar a barra de ferramentas posicionada no topo.",
  enableToolbarAppearsUponText:
    "Habilitar a barra de ferramentas que aparece ao selecionar texto.",
  enableToolbarWhosePositionMay:
    "Habilitar a barra de ferramentas cuja posição pode ser fixa onde você preferir.",
  enterIconCodeFormatSvg:
    "Digite o código do ícone, formato como <svg>.... </svg>",
  error: "Erro: ",
  exampleText: "Texto de exemplo:",
  explainSyntaxJavascriptRegularExpressions:
    "Explicar a sintaxe das expressões regulares em JavaScript",
  export: "Exportar",
  exportConfiguration: "Exportar Configuração",
  exportType: "Tipo de Exportação",
  exportToolbarConfigurationShareOthers:
    "Exportar sua configuração da barra de ferramentas para compartilhar com outros.",
  exportGenerateJsonConfigurationCan:
    "Exportar: Gerar uma configuração em formato JSON para salvar ou compartilhar.",
  failedCopyConfiguration: "Falha ao copiar configuração",
  fetchRemoteTitle: "Obter Título Remoto",
  fitEditorWidth: "Ajustar Largura do Editor",
  fixedPositionOffset: "Deslocamento Fixo",
  fixedStyle: "Estilo Fixo",
  fixedToolbar: "Barra de Ferramentas Fixa",
  followingStyle: "Estilo Contextual",
  fontColors: "Cores de Texto",
  fontColorFormattingBrush: "Pincel de cor da fonte ativado!",
  backgroundColorFormattingBrush: "Pincel de cor de fundo ativado!",
  exampleConvertHttpsExampleCom:
    "Por exemplo, converter https://exemplo.com para [https://exemplo.com](https://exemplo.com)",
  formatBrush: "Pincel de formatação",
  formatBrushSelectTextApply:
    "Pincel de formatação ativado! Selecione o texto para aplicar【",
  formatPhoneNumber: "Formatar número de telefone",
  general: "Geral",
  getInspiredWhatOthersHave:
    "Inspire-se com o que outros criaram ou mostre suas próprias personalizações.",
  globalReplace: "Substituir globalmente",
  horizontalPosition: "Posição Horizontal",
  howUseAiGetRegular: "Como usar IA para obter expressões regulares?",
  iNeedConvertUrlMarkdown:
    "Preciso converter a URL para um link no formato Markdown",
  icon: "Ícone",
  ifImageTurn: "Se for uma imagem, ative",
  ifTextContainsImportantSet:
    'Se o texto contiver "importante", aplicar destaque ao texto (formatação condicional)',
  ignoreCase: "Ignorar maiúsculas e minúsculas",
  imageHeight: "Altura da Imagem",
  imageSize: "Tamanho da Imagem",
  imageWidth: "Largura da Imagem",
  import: "Importar",
  importConfiguration: "Configuração de Importação",
  importMode: "Modo de Importação",
  importToolbarConfigurationJson:
    "Importar configuração da barra de ferramentas em formato JSON.",
  importExport: "Importar/Exportar",
  importPastePreviouslyExportedJson:
    "Importar: Colar uma configuração em formato JSON exportada anteriormente.",
  inputContent: "Digite o conteúdo",
  inputExampleTextViewFormatting:
    "Digite um texto de exemplo para visualizar o efeito do comando...",
  inputTitle: "Digite o título",
  insert: "Inserir",
  insertNewLine: "Inserir Nova Linha",
  insertLinkNextLine: "Inserir um link na próxima linha",
  invalidImportDataFormat: "Formato de dados de importação inválido",
  joinCommunity: "Juntar-se à Comunidade",
  lineHeadFormat: "Formatação de linha inicial",
  lineOffset: "Deslocamento da linha",
  lineOffsetCursorAfterFormatting:
    "Deslocamento da linha do cursor após a formatação",
  linkText: "Texto do Link",
  linkTitleOptional: "Título do Link (opcional)",
  linkUrl: "URL do Link",
  loading: "Carregando...",
  matchCaseInsensitive: "Ignorar maiúsculas e minúsculas",
  matchingPattern: "Padrão de correspondência",
  more: "Mais",
  multilineMode: "Modo multilinha",
  mustExistRegularExpressionText: "Deve existir expressão regular ou texto",
  updateFixedStyleCommands: "Atualizar Comandos de Estilo Fixo",
  updateFollowingStyleCommands: "Atualizar Comandos de Estilo Contextual",
  updateTopStyleCommands: "Atualizar Comandos de Estilo de Topo",
  validConfigurationFoundImportData:
    "Nenhuma configuração válida encontrada nos dados de importação",
  onlyApplyCustomCommandWhen:
    "Aplicar o comando personalizado apenas quando o texto corresponder à condição",
  open: "Abrir",
  optionalLeaveBlankDefaultTitle:
    "Opcional, deixe em branco para o título padrão",
  overwriteImport: "Sobrescrever Importação",
  overwriteModeReplaceSettingsImported:
    "Modo de Sobrescrever (Substituir configurações com as importadas)",
  pasteParse: "Colar e Analisar",
  pasteConfigurationHere: "Colar configuração aqui...",
  pattern: "Padrão",
  pleaseEnterUrlFirst: "Por favor digite uma URL primeiro",
  pleaseEnterNewName: "Por favor, digite um novo nome: ",
  pleaseExecuteFormatCommandSelect:
    "Execute um comando de formatação ou selecione um texto já formatado antes de ativar o pincel de formatação.",
  pleasePasteConfigurationDataFirst:
    "Por favor coloque os dados da configuração primeiro",
  pleaseSelectTextFirst: "Por favor selecione o texto primeiro",
  pleaseSelectTextCopyText:
    "Por favor selecione o texto ou copie o texto para a área de transferência primeiro",
  positionSettings: "Configurações de Posição",
  prefix: "Prefixo",
  prefixSuffix: "Prefixo/Sufixo",
  preview: "Visualizar",
  regexCommandExecutionError: "Erro ao executar comando de regex: ",
  regexPatternCannotEmpty: "Padrão de regex não pode estar vazio",
  regexPatternMatch: "Padrão de regex a ser correspondido",
  regularExpressionExamples: "Exemplos de expressões regulares",
  removeExtraSpaces: "Remover espaços extra",
  renumberList: "Renumerar Lista",
  replaceAllMatches: "Substituir todas as ocorrências",
  replacementPattern: "Padrão de substituição",
  replacementPatternUse12:
    "Padrão de substituição (use $1, $2, etc. para referenciar grupos de captura)",
  reset: "Reiniciar",
  result: "Resultado: ",
  save: "Salvar",
  selectPresetToolbarThemeAutomatically:
    "Selecione um estilo de barra de ferramentas pré-definido, automaticamente definindo a cor de fundo, cor do ícone e tamanho para o estilo selecionado.",
  setPositionStyle: "Definir Estilo de Posição para:",
  setBackgroundColorToolbar: "Definir a cor de fundo da barra de ferramentas.",
  setColorToolbarIcon: "Definir a cor do ícone da barra de ferramentas.",
  setSizeToolbarIconPx:
    "Definir o tamanho do ícone da barra de ferramentas (px); padrão: 18px",
  settings: "Configurações",
  shareToolbarSettingsStylesOur:
    "Compartilhe suas configurações e estilos da barra de ferramentas em nossa",
  suffix: "Sufixo",
  switchRegexCommandWindow: "Trocar para Janela de Comando de Regex",
  command2: "O comando",
  selectedTextDoesNotMeet:
    "O texto selecionado não atende aos requisitos da condição",
  import3: "Esta importação irá:",
  title: "Título",
  toolbarBackgroundColor: "Cor de Fundo da Barra de Ferramentas",
  toolbarCommands: "Comandos da Barra de Ferramentas",
  toolbarIconColor: "Cor do Ícone da Barra de Ferramentas",
  toolbarIconSize: "Tamanho do Ícone da Barra de Ferramentas",
  toolbarPosition: "Posição da Barra de Ferramentas",
  toolbarPreviewHypotheticalCommandConfigurati:
    "Visualização da barra de ferramentas (com uma configuração de comandos hipotética).",
  toolbarSettings: "Configurações da Barra de Ferramentas",
  toolbarTheme: "Estilo da Barra de Ferramentas",
  topStyle: "Estilo de Topo",
  topToolbar: "Barra de Ferramentas de Topo",
  urlFormatError: "Erro de Formato de URL",
  urlMarkdownLink: "URL para Link Markdown",
  updateCustomCommands: "Atualizar Comandos Personalizados",
  updateImport: "Atualizar Importação",
  updateMainMenuCommands: "Atualizar Comandos do Menu Principal",
  updateModeAddNewItems:
    "Modo de Atualização (Adicionar novos itens e atualizar os existentes)",
  updateGeneralSettings: "Atualizar configurações gerais",
  usageInstructions: "Instruções de Uso",
  useNRepresentLineBreaks: "Use \\n para representar quebras de linha",
  useCondition: "Usar condição",
  useCurrentLineRegexCommands: "Usar a linha atual para comandos de regex",
  useJsRegularExpressionImplement:
    "Usar expressões regulares em JavaScript para implementar e gerar os parâmetros no formato abaixo (o resultado não precisa ser escapado em JSON).",
  useRepresentLineBreaks: "Use ↵ para representar quebras de linha",
  verticalPosition: "Posição Vertical",
  verticalSplit: "Divisão Vertical",
  warningImportingConfigurationOverwriteCurren:
    "Aviso: A importação de configuração irá sobrescrever suas configurações atuais. Considere exportar sua configuração atual primeiro como backup.",
  warningOverwriteModeReplaceExisting:
    "Aviso: O modo de sobrescrever irá substituir todas as suas configurações atuais com as importadas.",
  warningUpdateModeAddNew:
    "Aviso: O modo de atualização irá adicionar novos itens e atualizar os existentes com base na configuração importada.",
  whenTextSelectedRegexCommands:
    "Quando não houver texto selecionado, comandos de regex usarão a linha atual em vez do conteúdo da área de transferência",
  whetherToolbarCentredFullWidth:
    "Define se a barra de ferramentas é centralizada ou ocupa toda a largura. O padrão é largura completa.",
  whetherInsertBeginningNextLine: "Inserir no início da próxima linha",
  description: "[Descrição]",
  example: "[Exemplo]",
  output: "[Saída]",
  requirements: "[Requisitos]",
  matchStartEndEachLine: "^ e $ correspondem ao início e ao fim de cada linha",
  alreadyExists: "já existe",
  configuration: "configuração",
  insert2: "para inserir",
  updateModeMergeImportedSettings:
    "ℹ️ O modo de atualização irá adicionar novos itens e atualizar os existentes com base na configuração importada.",
  overwriteModeReplaceExistingSettings:
    "⚠️ O modo de sobrescrever irá substituir todas as suas configurações atuais com as importadas.",
  format:
    "】\nClique com o botão do meio ou direito do mouse para sair do modo de formatação.",
  setCustomBackground: "🎨 Definir Cor de Fundo Personalizada",
  setCustomFontColor: "🖌️ Definir Cor de Texto Personalizada",
};

export default ui;

export const commandNames: Record<string, string> = {
  Custom: "Personalizado",
  "All commands": "Todos os Comandos",
  "Following Toolbar": "Barra de Ferramentas Contextual",
};
