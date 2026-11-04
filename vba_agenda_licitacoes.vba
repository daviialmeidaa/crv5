Option Explicit

' Configuracao unica da integracao existente. Para teste local, altere somente a URL.
Private Const AGENDA_API_URL As String = "https://hub.nexomed.com.br/api/vba/agenda_licitacoes"
Private Const AGENDA_API_KEY As String = "KiX185M2ojzoQFONvQT2TYkPMRU3ltF4"
Private Const AGENDA_PASSWORD As String = "B1I2O3"

Sub read_Database()
    Dim ws As Worksheet
    Dim registros As Object, registro As Object
    Dim dados() As Variant, campos As Variant
    Dim i As Long, coluna As Long, ultimaLinha As Long
    Dim ultimaCelula As Range, constantes As Range
    Dim calculoAnterior As XlCalculation, telaAnterior As Boolean
    Dim mensagemErro As String

    calculoAnterior = Application.Calculation
    telaAnterior = Application.ScreenUpdating
    On Error GoTo Falha
    ActiveSheet.Calculate
    Application.ScreenUpdating = False
    Application.Calculation = xlManual
    Set ws = Sheets("Agenda")

    ' Ler e preparar toda a resposta antes de modificar os dados visiveis.
    Set registros = AgendaRequest("GET")
    If TypeName(registros) <> "Collection" Then Err.Raise vbObjectError + 2100, , "A API nao retornou uma lista de agendas."
    If registros.Count > ws.Rows.Count - 2 Then Err.Raise vbObjectError + 2101, , "A agenda excede a capacidade da planilha."
    campos = Array("CHAVE", "data_limite", "hora_limite", "data_lances", "hora_lances", _
                   "modalidade", "pregao", "orgao", "uf", "categoria", "objeto", _
                   "portal", "empresa", "data_cadastro", "observacoes_status")
    If registros.Count > 0 Then
        ReDim dados(1 To registros.Count, 1 To 15)
        For i = 1 To registros.Count
            Set registro = registros(i)
            If Not registro.Exists("CHAVE") Then Err.Raise vbObjectError + 2102, , "Registro da API sem CHAVE."
            For coluna = 1 To 15
                Select Case coluna
                    Case 2, 4, 14
                        dados(i, coluna) = AgendaDate(AgendaField(registro, CStr(campos(coluna - 1))))
                    Case 3, 5
                        dados(i, coluna) = AgendaTime(AgendaField(registro, CStr(campos(coluna - 1))))
                    Case Else
                        dados(i, coluna) = AgendaField(registro, CStr(campos(coluna - 1)))
                End Select
            Next coluna
        Next i
    End If

    ws.Select
    ws.Unprotect AGENDA_PASSWORD
    Set ultimaCelula = ws.Range("A:O").Find(What:="*", After:=ws.Range("A1"), _
        LookIn:=xlFormulas, LookAt:=xlPart, SearchOrder:=xlByRows, _
        SearchDirection:=xlPrevious, MatchCase:=False, SearchFormat:=False)
    ultimaLinha = 3
    If Not ultimaCelula Is Nothing Then ultimaLinha = Application.Max(3, ultimaCelula.Row)

    ' Remove constantes antigas para refletir tambem exclusoes feitas pelo Hub.
    ' Formulas e colunas P:Q nao sao apagadas nem substituidas pela API.
    On Error Resume Next
    Set constantes = ws.Range("A3:O" & ultimaLinha).SpecialCells(xlCellTypeConstants)
    On Error GoTo Falha
    If Not constantes Is Nothing Then constantes.ClearContents

    For i = 1 To registros.Count
        ' Identificador como texto, sem arredondar um bigint do PostgreSQL.
        ws.Cells(i + 2, 1).NumberFormat = "@"
        For coluna = 1 To 15
            ws.Cells(i + 2, coluna).Value = dados(i, coluna)
        Next coluna
    Next i

    ' Preserva a selecao e a celula ativa do fluxo original. As rotinas da
    ' pasta de trabalho podem usar Selection/ActiveCell ao preparar e ordenar.
    Range("A3:Q5000").Select
    With Selection.Font
        .ColorIndex = xlAutomatic
        .TintAndShade = 0
    End With

    Application.GoTo Reference:="R5000C1"
    Range("A5000:Q5000").Select
    Range(Selection, Selection.End(xlUp)).Select
    Range(Selection, Selection.End(xlUp)).Select
    Range("A3:Q5000").Select
    Range("A5000").Activate

    With Selection.Font
        .ThemeColor = xlThemeColorLight1
        .TintAndShade = 0
    End With

    Sheets("Agenda").Select
    Call adjusting_Date
    OrganizaAgendaPorChave ws

    Sheets("Agenda").Protect AGENDA_PASSWORD, DrawingObjects:=True, Contents:=True, Scenarios:=True _
        , AllowSorting:=True, AllowFiltering:=True, AllowUsingPivotTables:=True

    Sheets("Agenda").Select
    Range("A2").Select
    Range("A2").Select
    Selection.End(xlDown).Select
    Application.Calculation = xlAutomatic
    Application.ScreenUpdating = True
    Exit Sub
Falha:
    mensagemErro = "Nao foi possivel ler os dados do Hub: " & Err.Description
    RestoreAgenda ws, calculoAnterior, telaAnterior
    MsgBox mensagemErro, vbExclamation
End Sub

Sub insert_Database()
    Dim ws As Worksheet, rng As Range, resposta As Object
    Dim inicio As Long, fim As Long, i As Long, concluidos As Long
    Dim calculoAnterior As XlCalculation, telaAnterior As Boolean
    Dim mensagemErro As String

    calculoAnterior = Application.Calculation
    telaAnterior = Application.ScreenUpdating
    On Error GoTo Falha
    ActiveSheet.Calculate
    Application.ScreenUpdating = False
    Application.Calculation = xlManual
    Set ws = Sheets("Agenda")
    ws.Select
    ws.Unprotect AGENDA_PASSWORD
    Set rng = Selection
    inicio = rng.Row
    fim = rng.Row + rng.Rows.Count - 1
    If inicio < 3 Then Err.Raise vbObjectError + 2103, , "Selecione as linhas de dados a partir da linha 3."

    For i = inicio To fim
        ' Sem Access/@@IDENTITY: o Hub gera a chave pela mesma sequencia usada na interface.
        Set resposta = AgendaRequest("POST", "", AgendaPayload(ws, i))
        If Not resposta.Exists("CHAVE") Then Err.Raise vbObjectError + 2104, , "A API nao retornou a CHAVE. Releia os dados antes de repetir a inclusao."
        ws.Cells(i, 1).NumberFormat = "@"
        ws.Cells(i, 1).Value = CStr(resposta("CHAVE"))
        concluidos = concluidos + 1
    Next i
    Call read_Database
    GoTo Finalizar
Falha:
    mensagemErro = "Inclusao interrompida na linha " & i & ". " & concluidos & _
        " linha(s) confirmada(s) pelo Hub. " & Err.Description & vbCrLf & _
        "Em caso de falha de rede, use Ler Dados e confira o Hub antes de repetir uma inclusao."
Finalizar:
    RestoreAgenda ws, calculoAnterior, telaAnterior
    If mensagemErro <> "" Then MsgBox mensagemErro, vbExclamation
End Sub

Sub update_Database()
    Dim ws As Worksheet, rng As Range, resposta As Object, pintar As Range
    Dim inicio As Long, fim As Long, i As Long, concluidos As Long
    Dim chave As String, mensagemErro As String
    Dim calculoAnterior As XlCalculation, telaAnterior As Boolean

    calculoAnterior = Application.Calculation
    telaAnterior = Application.ScreenUpdating
    On Error GoTo Falha
    ActiveSheet.Calculate
    Application.ScreenUpdating = False
    Application.Calculation = xlManual
    Set ws = Sheets("Agenda")
    ws.Select
    ws.Unprotect AGENDA_PASSWORD
    Set rng = Selection
    inicio = rng.Row
    fim = rng.Row + rng.Rows.Count - 1
    If inicio < 3 Then Err.Raise vbObjectError + 2103, , "Selecione as linhas de dados a partir da linha 3."

    For i = inicio To fim
        chave = Trim$(CStr(ws.Cells(i, 1).Value))
        If chave <> "" Then
            ValidateAgendaKey chave
            Set resposta = AgendaRequest("PUT", "/" & chave, AgendaPayload(ws, i))
            concluidos = concluidos + 1
        End If
    Next i
    Set pintar = Intersect(rng.EntireRow, ws.Range("A3:Q5000"))
    If Not pintar Is Nothing Then pintar.Font.Color = RGB(0, 176, 80)
    OrganizaAgendaPorChave ws
    GoTo Finalizar
Falha:
    mensagemErro = "Atualizacao interrompida na linha " & i & ". " & concluidos & _
        " linha(s) confirmada(s) pelo Hub. " & Err.Description
Finalizar:
    RestoreAgenda ws, calculoAnterior, telaAnterior
    If mensagemErro <> "" Then MsgBox mensagemErro, vbExclamation
End Sub

Sub Delete_BML()
    Dim ws As Worksheet, rng As Range, resposta As Object
    Dim inicio As Long, fim As Long, i As Long, concluidos As Long, x As Long
    Dim chave As String, mensagemErro As String
    Dim calculoAnterior As XlCalculation, telaAnterior As Boolean

    calculoAnterior = Application.Calculation
    telaAnterior = Application.ScreenUpdating
    On Error GoTo Falha
    ActiveSheet.Calculate
    Application.ScreenUpdating = False
    Application.Calculation = xlManual
    Set ws = Sheets("Agenda")
    ws.Select
    ws.Unprotect AGENDA_PASSWORD
    Set rng = Selection
    inicio = rng.Row
    fim = rng.Row + rng.Rows.Count - 1
    If inicio < 3 Then Err.Raise vbObjectError + 2103, , "Selecione as linhas de dados a partir da linha 3."

    For i = inicio To fim
        chave = Trim$(CStr(ws.Cells(i, 1).Value))
        If chave <> "" Then
            ValidateAgendaKey chave
            Set resposta = AgendaRequest("DELETE", "/" & chave)
            concluidos = concluidos + 1
        End If
    Next i
    If concluidos > 0 Then
        MsgBox "O contrato foi excluido com sucesso!"
        ' Mantem o movimento de linha da macro original, apos confirmacao da API.
        x = ActiveCell.Row
        ws.Rows(x).Delete Shift:=xlUp
    End If
    Call read_Database
    GoTo Finalizar
Falha:
    mensagemErro = "Exclusao interrompida na linha " & i & ". " & concluidos & _
        " linha(s) confirmada(s) pelo Hub. " & Err.Description
Finalizar:
    RestoreAgenda ws, calculoAnterior, telaAnterior
    If mensagemErro <> "" Then MsgBox mensagemErro, vbExclamation
End Sub

Private Function AgendaRequest(ByVal metodo As String, Optional ByVal caminho As String = "", _
                               Optional ByVal payload As String = "") As Object
    Dim http As Object
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.SetTimeouts 10000, 10000, 30000, 60000
    http.Open metodo, AGENDA_API_URL & caminho, False
    http.setRequestHeader "Accept", "application/json"
    http.setRequestHeader "x-api-key", AGENDA_API_KEY
    If metodo = "GET" Then http.setRequestHeader "Cache-Control", "no-cache"
    If payload <> "" Then
        http.setRequestHeader "Content-Type", "application/json; charset=utf-8"
        http.Send payload
    Else
        http.Send
    End If
    If http.Status < 200 Or http.Status >= 300 Then
        Err.Raise vbObjectError + 2110, "AgendaRequest", "API HTTP " & http.Status & ": " & AgendaHttpError(http.ResponseText)
    End If
    Set AgendaRequest = JsonConverter.ParseJson(http.ResponseText)
End Function

Private Function AgendaHttpError(ByVal corpo As String) As String
    Dim erroApi As Object
    AgendaHttpError = "O Hub recusou a operacao. Confira a URL e a chave da API."
    On Error GoTo Finalizar
    Set erroApi = JsonConverter.ParseJson(corpo)
    If erroApi.Exists("error") Then AgendaHttpError = CStr(erroApi("error"))
Finalizar:
End Function

Private Function AgendaPayload(ByVal ws As Worksheet, ByVal linha As Long) As String
    Dim campos As Variant, colunas As Variant, valor As Variant
    Dim posicao As Long, campo As String, json As String
    campos = Array("empresa", "pregao", "modalidade", "orgao", "uf", "categoria", _
                   "objeto", "portal", "observacoes_status", "data_cadastro", "data_limite", _
                   "hora_limite", "data_lances", "hora_lances", "antecedencia")
    colunas = Array(13, 7, 6, 8, 9, 10, 11, 12, 15, 14, 2, 3, 4, 5, 16)
    json = "{"
    For posicao = LBound(campos) To UBound(campos)
        campo = CStr(campos(posicao))
        valor = ws.Cells(linha, colunas(posicao)).Value
        If IsError(valor) Then Err.Raise vbObjectError + 2111, , "Celula com erro na coluna " & colunas(posicao) & "."
        If IsNull(valor) Or IsEmpty(valor) Then valor = ""
        If campo = "hora_limite" Or campo = "hora_lances" Or campo = "antecedencia" Then
            valor = Replace(CStr(valor), ",", ".")
            If valor = "" Then valor = 0
        End If
        If posicao > LBound(campos) Then json = json & ","
        json = json & Chr$(34) & campo & Chr$(34) & ":" & Chr$(34) & SanitizeJSON(CStr(valor)) & Chr$(34)
    Next posicao
    AgendaPayload = json & "}"
End Function

Private Function AgendaField(ByVal registro As Object, ByVal campo As String) As Variant
    If Not registro.Exists(campo) Then Exit Function
    If IsNull(registro(campo)) Then Exit Function
    AgendaField = registro(campo)
End Function

Private Function AgendaDate(ByVal valor As Variant) As Variant
    If IsEmpty(valor) Or IsNull(valor) Then Exit Function
    If CStr(valor) = "" Then Exit Function
    Dim texto As String
    texto = CStr(valor)
    ' Preserva o dia da agenda; nao converter a meia-noite ISO para o fuso do PC.
    If Len(texto) >= 10 And Mid$(texto, 5, 1) = "-" And Mid$(texto, 8, 1) = "-" Then
        AgendaDate = DateSerial(CLng(Left$(texto, 4)), CLng(Mid$(texto, 6, 2)), CLng(Mid$(texto, 9, 2)))
    Else
        Err.Raise vbObjectError + 2112, , "Data da API em formato inesperado."
    End If
End Function

Private Function AgendaTime(ByVal valor As Variant) As Variant
    If IsEmpty(valor) Or IsNull(valor) Then Exit Function
    If CStr(valor) = "" Then Exit Function
    Dim partes As Variant, segundos As Double
    partes = Split(CStr(valor), ":")
    If UBound(partes) < 1 Then Err.Raise vbObjectError + 2113, , "Hora da API em formato inesperado."
    If UBound(partes) >= 2 Then segundos = Val(partes(2))
    AgendaTime = (CLng(partes(0)) * 3600# + CLng(partes(1)) * 60# + segundos) / 86400#
End Function

Private Sub OrganizaAgendaPorChave(ByVal ws As Worksheet)
    Dim ultimaLinha As Long
    ultimaLinha = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    If ultimaLinha < 4 Then Exit Sub

    ' A CHAVE fica como texto para preservar seus digitos, mas a ordenacao
    ' considera seu valor numerico: 2 vem antes de 10. Move a linha A:Q inteira.
    With ws.Sort
        .SortFields.Clear
        .SortFields.Add Key:=ws.Range("A3:A" & ultimaLinha), SortOn:=xlSortOnValues, _
            Order:=xlAscending, DataOption:=xlSortTextAsNumbers
        .SetRange ws.Range("A3:Q" & ultimaLinha)
        .Header = xlNo
        .MatchCase = False
        .Orientation = xlTopToBottom
        .Apply
    End With
End Sub

Private Sub ValidateAgendaKey(ByVal chave As String)
    Dim digitos As String
    digitos = chave
    If Left$(digitos, 1) = "-" Then digitos = Mid$(digitos, 2)
    If digitos = "" Or digitos Like "*[!0-9]*" Then Err.Raise vbObjectError + 2114, , "CHAVE invalida. Use Ler Dados antes de atualizar ou excluir."
End Sub

Private Sub RestoreAgenda(ByVal ws As Worksheet, ByVal calculoAnterior As XlCalculation, ByVal telaAnterior As Boolean)
    ' Limpeza deve ocorrer tambem em erro HTTP, sem ocultar a falha principal.
    On Error Resume Next
    If Not ws Is Nothing Then
        ws.Protect AGENDA_PASSWORD, DrawingObjects:=True, Contents:=True, Scenarios:=True, _
            AllowSorting:=True, AllowFiltering:=True, AllowUsingPivotTables:=True
    End If
    Application.Calculation = calculoAnterior
    Application.ScreenUpdating = telaAnterior
    On Error GoTo 0
End Sub

' Mesma higienizacao usada pela integracao anterior.
Function SanitizeJSON(ByVal text As String) As String
    If IsNull(text) Or text = "" Then
        SanitizeJSON = ""
        Exit Function
    End If
    Dim res As String
    res = text
    res = Replace(res, "\", "\\")
    res = Replace(res, """", "'")
    res = Replace(res, vbCrLf, " ")
    res = Replace(res, vbCr, " ")
    res = Replace(res, vbLf, " ")
    res = Replace(res, vbTab, " ")
    SanitizeJSON = res
End Function

Sub Delete_Form_BML()
    Shield.Show
End Sub
