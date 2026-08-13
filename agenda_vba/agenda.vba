Sub insert_Database()

'Calcula
    ActiveSheet.Calculate
'Desabilita atualização de tela
    Application.ScreenUpdating = False
'Desativa modo automático de cálculo
    Application.Calculation = xlManual
    
    Sheets("Agenda").Select
    Sheets("Agenda").Unprotect ("B1I2O3")

    Dim sql As String
    Dim cn As ADODB.Connection
    Dim rs As ADODB.Recordset
    Dim end_row
    Dim start_row
    Dim rng As Range
    Dim valor
    Dim chave
    Set rng = Selection

'define a conexão com o banco de dados Northwind.mdb
    Set cn = New ADODB.Connection
    cn.ConnectionString = "Provider=Microsoft.ACE.OLEDB.12.0 ;Data Source=\\10.0.0.2\SupraSGC\BD_Ferramentas\BD_Ferramentas_Novas\AGENDA_LICITACOES.accdb;Persist Security Info=False;"
    cn.Open
'define um novo objeto recordset
    Set rs = New ADODB.Recordset


'obtendo inicio e fim das linhas selecionadas
'linha inicial da seleção
    start_row = rng.Row
'linha final da seleção
    end_row = rng.Row + rng.Rows.Count - 1

'se não encontrar nenhuma linha selecionada sai da função
    If start_row = "" Then
        MsgBox "Selecione alguma linha"
        Exit Sub
    End If

'iterando sob as linhas selecionadas e buscando seus valores
    For i = start_row To end_row
        data_limite = Cells(i, 2).Value
        hora_limite = Replace(Cells(i, 3).Value, ",", ".")
        data_lances = Cells(i, 4).Value
        hora_lances = Replace(Cells(i, 5).Value, ",", ".")
        modalidade = Cells(i, 6).Value
        pregao = Cells(i, 7).Value
        orgao = Cells(i, 8).Value
        uf = Cells(i, 9).Value
        categoria = Cells(i, 10).Value
        objeto = Cells(i, 11).Value
        portal = Cells(i, 12).Value
        empresa = Cells(i, 13).Value
        data_cadastro = Cells(i, 14).Value
        observacoes = Cells(i, 15).Value
        antecedencia = Replace(Cells(i, 16).Value, ",", ".")
       
'Tratando valores vazios e setando padrões
   
   If data_limite = "" Then
    data_limite = ""
   End If
   
   If hora_limite = "" Then
    hora_limite = 0
   End If
   
   If data_lances = "" Then
    data_lances = ""
   End If
   
   If hora_lances = "" Then
    hora_lances = 0
   End If
   
   If modalidade = "" Then
    modalidade = ""
   End If
   
   If pregao = "" Then
    pregao = ""
   End If
   
   If orgao = "" Then
    orgao = ""
   End If
   
   If uf = "" Then
    uf = ""
   End If
   
   If categoria = "" Then
    categoria = ""
   End If
   
   If objeto = "" Then
    objeto = ""
   End If
   
   If portal = "" Then
    portal = ""
   End If
   
   If empresa = "" Then
    empresa = ""
   End If
   
   If data_cadastro = "" Then
    data_cadastro = ""
   End If
   
   If observacoes = "" Then
    observacoes = ""
   End If
   
   If antecedencia = "" Then
    antecedencia = 0
   End If
   
'fim do tratamento de vazios

'pegando a primeira coluna que contém a chave
    chave = Cells(i, 1).Value
        
'define a instrução sql
    sql = "INSERT INTO AGENDA_LICITACAO (DATA_LIMITE, HORA_LIMITE, DATA_LANCES, HORA_LANCES, MODALIDADE, PREGAO, ORGAO, UF, CATEGORIA, OBJETO, PORTAL, EMPRESA, DATA_CADASTRO, OBSERVACOES, ANTECEDENCIA)VALUES('" & data_limite & "', " & hora_limite & ", '" & data_lances & "', " & hora_lances & ", '" & modalidade & "', '" & pregao & "', '" & orgao & "', '" & uf & "', '" & categoria & "', '" & objeto & "', '" & portal & "', '" & empresa & "', '" & data_cadastro & "', '" & observacoes & "', " & antecedencia & ");"

'MsgBox sql
    Sheets("Agenda").Select

'gera o recordset para o sql sobre a conexao definida
'rs.Open
' Execute the statement.
        'MsgBox sql

    cn.Execute sql, , adCmdText
    
' ----------------------------------------------------
' INTEGRAÇÃO HEROKU (API Node.js) - SHADOWING (INSERT)
' ----------------------------------------------------
    On Error Resume Next
    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    Dim apiUrl As String
    apiUrl = "https://nexomed-crv5.herokuapp.com/api/vba/agenda_licitacoes"
    Dim jsonPayload As String
    jsonPayload = "{ " & _
        """empresa"": """ & SanitizeJSON(CStr(empresa)) & """, " & _
        """pregao"": """ & SanitizeJSON(CStr(pregao)) & """, " & _
        """modalidade"": """ & SanitizeJSON(CStr(modalidade)) & """, " & _
        """orgao"": """ & SanitizeJSON(CStr(orgao)) & """, " & _
        """uf"": """ & SanitizeJSON(CStr(uf)) & """, " & _
        """categoria"": """ & SanitizeJSON(CStr(categoria)) & """, " & _
        """objeto"": """ & SanitizeJSON(CStr(objeto)) & """, " & _
        """portal"": """ & SanitizeJSON(CStr(portal)) & """, " & _
        """observacoes_status"": """ & SanitizeJSON(CStr(observacoes)) & """, " & _
        """data_cadastro"": """ & SanitizeJSON(CStr(data_cadastro)) & """, " & _
        """data_limite"": """ & SanitizeJSON(CStr(data_limite)) & """, " & _
        """hora_limite"": """ & SanitizeJSON(CStr(hora_limite)) & """, " & _
        """data_lances"": """ & SanitizeJSON(CStr(data_lances)) & """, " & _
        """hora_lances"": """ & SanitizeJSON(CStr(hora_lances)) & """, " & _
        """antecedencia"": """ & SanitizeJSON(CStr(antecedencia)) & """" & _
    "}"
    http.Open "POST", apiUrl, False
    http.setRequestHeader "Content-Type", "application/json"
    http.setRequestHeader "x-api-key", "sua_chave_secreta_vba_aqui"
    http.send jsonPayload
    Set http = Nothing
    On Error GoTo 0
' ----------------------------------------------------
    
    Next i
    'DisparaEmail = EnviaEmail(bodyemaildatalimite, bodyemailhoralimite)

' Close the connection.
    cn.Close
    
'Call Proteger
    
    Sheets("Agenda").Select

    Call read_Database
    
    
    
    'Range("A3").Select
    
    Sheets("Agenda").Protect "B1I2O3", DrawingObjects:=True, Contents:=True, Scenarios:=True _
        , AllowSorting:=True, AllowFiltering:=True, AllowUsingPivotTables:=True
        
    Application.Calculation = xlAutomatic 'Ativa modo automático de cálculo
        Application.ScreenUpdating = True 'Habilita atualização de tela
    
End Sub

Sub update_Database()

'Calcula
    ActiveSheet.Calculate
'Desabilita atualização de tela
    Application.ScreenUpdating = False
'Desativa modo automático de cálculo
    Application.Calculation = xlManual
    
    Sheets("Agenda").Select

    Sheets("Agenda").Unprotect ("B1I2O3")
    
    Dim sql As String
    Dim cn As ADODB.Connection
    Dim rs As ADODB.Recordset
    Dim end_row
    Dim start_row
    Dim rng As Range
    Dim valor
    Dim chave
    Set rng = Selection

'define a conexão com o banco de dados Northwind.mdb
    Set cn = New ADODB.Connection
    cn.ConnectionString = "Provider=Microsoft.ACE.OLEDB.12.0 ;Data Source=\\10.0.0.2\SupraSGC\BD_Ferramentas\BD_Ferramentas_Novas\AGENDA_LICITACOES.accdb;Persist Security Info=False;"
    cn.Open
'define um novo objeto recordset
    Set rs = New ADODB.Recordset

    i = 3
'obtendo inicio e fim das linhas selecionadas
'linha inicial da seleção
    start_row = rng.Row
'linha final da seleção
    end_row = rng.Row + rng.Rows.Count - 1

'se não encontrar nenhuma linha selecionada sai da função
    If start_row = "" Then
    MsgBox "Selecione alguma linha"
    Exit Sub
    
    End If

'iterando sob as linhas selecionadas e buscando seus valores
    For i = start_row To end_row
        data_limite = Cells(i, 2).Value
        hora_limite = Replace(Cells(i, 3).Value, ",", ".")
        data_lances = Cells(i, 4).Value
        hora_lances = Replace(Cells(i, 5).Value, ",", ".")
        modalidade = Cells(i, 6).Value
        pregao = Cells(i, 7).Value
        orgao = Cells(i, 8).Value
        uf = Cells(i, 9).Value
        categoria = Cells(i, 10).Value
        objeto = Cells(i, 11).Value
        portal = Cells(i, 12).Value
        empresa = Cells(i, 13).Value
        data_cadastro = Cells(i, 14).Value
        observacoes = Cells(i, 15).Value
        antecedencia = Replace(Cells(i, 16).Value, ",", ".")
       
'Tratando valores vazios e setando padrões
   
   If data_limite = "" Then
    data_limite = ""
   End If
   
   If hora_limite = "" Then
    hora_limite = 0
   End If
   
   If data_lances = "" Then
    data_lances = ""
   End If
   
   If hora_lances = "" Then
    hora_lances = 0
   End If
   
   If modalidade = "" Then
    modalidade = ""
   End If
   
   If pregao = "" Then
    pregao = ""
   End If
   
   If orgao = "" Then
    orgao = ""
   End If
   
   If uf = "" Then
    uf = ""
   End If
   
   If categoria = "" Then
    categoria = ""
   End If
   
   If objeto = "" Then
    objeto = ""
   End If
   
   If portal = "" Then
    portal = ""
   End If
   
   If empresa = "" Then
    empresa = ""
   End If
   
   If data_cadastro = "" Then
    data_cadastro = ""
   End If
   
   If observacoes = "" Then
    observacoes = ""
   End If
   
   If antecedencia = "" Then
    antecedencia = 0
   End If
   
'fim do tratamento de vazios
'pegando a primeira coluna que contém a chave
    chave = Cells(i, 1).Value
'verifica se a chave já existe. Caso sim, atualiza registro.
    If chave <> "" Then
'define a instrução sql
    sql = "UPDATE AGENDA_LICITACAO SET DATA_LIMITE = '" & data_limite & "', HORA_LIMITE = " & hora_limite & ", DATA_LANCES = '" & data_lances & _
    "', HORA_LANCES = " & hora_lances & ", MODALIDADE = '" & modalidade & "', PREGAO = '" & pregao & "', ORGAO = '" & orgao & _
    "', UF = '" & uf & "', CATEGORIA = '" & categoria & "', OBJETO = '" & objeto & "', PORTAL = '" & portal & _
    "', EMPRESA = '" & empresa & "', DATA_CADASTRO = '" & data_cadastro & "', OBSERVACOES = '" & observacoes & _
    "', ANTECEDENCIA = " & antecedencia & " WHERE CHAVE = " & chave & ";"
    
'gera o recordset para o sql sobre a conexao definida
' Execute the statement.
'MsgBox sql

    cn.Execute sql, , adCmdText

' ----------------------------------------------------
' INTEGRAÇÃO HEROKU (API Node.js) - SHADOWING (UPDATE)
' ----------------------------------------------------
    On Error Resume Next
    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    Dim apiUrl As String
    apiUrl = "https://nexomed-crv5.herokuapp.com/api/vba/agenda_licitacoes/" & chave
    Dim jsonPayload As String
    jsonPayload = "{ " & _
        """empresa"": """ & SanitizeJSON(CStr(empresa)) & """, " & _
        """pregao"": """ & SanitizeJSON(CStr(pregao)) & """, " & _
        """modalidade"": """ & SanitizeJSON(CStr(modalidade)) & """, " & _
        """orgao"": """ & SanitizeJSON(CStr(orgao)) & """, " & _
        """uf"": """ & SanitizeJSON(CStr(uf)) & """, " & _
        """categoria"": """ & SanitizeJSON(CStr(categoria)) & """, " & _
        """objeto"": """ & SanitizeJSON(CStr(objeto)) & """, " & _
        """portal"": """ & SanitizeJSON(CStr(portal)) & """, " & _
        """observacoes_status"": """ & SanitizeJSON(CStr(observacoes)) & """, " & _
        """data_cadastro"": """ & SanitizeJSON(CStr(data_cadastro)) & """, " & _
        """data_limite"": """ & SanitizeJSON(CStr(data_limite)) & """, " & _
        """hora_limite"": """ & SanitizeJSON(CStr(hora_limite)) & """, " & _
        """data_lances"": """ & SanitizeJSON(CStr(data_lances)) & """, " & _
        """hora_lances"": """ & SanitizeJSON(CStr(hora_lances)) & """, " & _
        """antecedencia"": """ & SanitizeJSON(CStr(antecedencia)) & """" & _
    "}"
    http.Open "PUT", apiUrl, False
    http.setRequestHeader "Content-Type", "application/json"
    http.setRequestHeader "x-api-key", "sua_chave_secreta_vba_aqui"
    http.send jsonPayload
    Set http = Nothing
    On Error GoTo 0
' ----------------------------------------------------

    End If
    
    Next i

'Close the connection.
    cn.Close
    
    Intersect(Selection.EntireRow, Range("A3:Q5000")).Font.Color = RGB(0, 176, 80)
           
    Sheets("Agenda").Select
    
    Call OrganizaDataLances
    
    Sheets("Agenda").Protect "B1I2O3", DrawingObjects:=True, Contents:=True, Scenarios:=True _
        , AllowSorting:=True, AllowFiltering:=True, AllowUsingPivotTables:=True
    
    Application.Calculation = xlAutomatic 'Ativa modo automático de cálculo
        Application.ScreenUpdating = True 'Habilita atualização de tela
    
End Sub

Sub Delete_BML()

'Calcula
    ActiveSheet.Calculate
'Desabilita atualização de tela
    Application.ScreenUpdating = False
'Desativa modo automático de cálculo
    Application.Calculation = xlManual
    
    Sheets("Agenda").Select
    Sheets("Agenda").Unprotect ("B1I2O3")
    
    Dim sql As String
    Dim cn As ADODB.Connection
    Dim rs As ADODB.Recordset
    Dim end_row
    Dim start_row
    Dim rng As Range
    Dim valor
    Dim chave
    Set rng = Selection

'define a conexão com o banco de dados Northwind.mdb
    Set cn = New ADODB.Connection
    cn.ConnectionString = "Provider=Microsoft.ACE.OLEDB.12.0 ;Data Source=\\10.0.0.2\SupraSGC\BD_Ferramentas\BD_Ferramentas_Novas\AGENDA_LICITACOES.accdb;Persist Security Info=False;"
    cn.Open
'define um novo objeto recordset
    Set rs = New ADODB.Recordset

'obtendo inicio e fim das linhas selecionadas
'linha inicial da seleção
    start_row = rng.Row
'linha final da seleção
    end_row = rng.Row + rng.Rows.Count - 1

'se não encontrar nenhuma linha selecionada sai da função
    If start_row = "" Then
        MsgBox "Selecione alguma linha"
        Exit Sub
    End If
     
'iterando sob as linhas selecionadas e buscando seus valores
    For i = start_row To end_row
'pegando a primeira coluna que contém a chave
    chave = Cells(i, 1).Value
'verifica se a chave já existe. Caso sim, atualiza registro.
    If chave <> "" Then
    
'define a instrução sql
    sql = "DELETE FROM AGENDA_LICITACAO WHERE CHAVE = " & chave & ";"
    
    cn.Execute sql, , adCmdText
    
' ----------------------------------------------------
' INTEGRAÇÃO HEROKU (API Node.js) - SHADOWING (DELETE)
' ----------------------------------------------------
    On Error Resume Next
    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    Dim apiUrl As String
    apiUrl = "https://nexomed-crv5.herokuapp.com/api/vba/agenda_licitacoes/" & chave
    http.Open "DELETE", apiUrl, False
    http.setRequestHeader "x-api-key", "sua_chave_secreta_vba_aqui"
    http.send
    Set http = Nothing
    On Error GoTo 0
' ----------------------------------------------------
    
    End If
        
    Next i
     
    MsgBox "O contrato foi excluído com sucesso!"
    
    x = ActiveCell.Row
    
    Rows(x).Select
    Selection.Delete Shift:=xlUp
          
          'Else
          'MsgBox "O contrato não foi excluído"
          
    ' End If


    ' Close the connection.
    cn.Close
    
    Call read_Database
  
    
    Sheets("Agenda").Select
 
    Sheets("Agenda").Protect "B1I2O3", DrawingObjects:=True, Contents:=True, Scenarios:=True _
        , AllowSorting:=True, AllowFiltering:=True, AllowUsingPivotTables:=True
        
    Application.Calculation = xlAutomatic 'Ativa modo automático de cálculo
    Application.ScreenUpdating = True 'Habilita atualização de tela


End Sub

' ----------------------------------------------------
' FUNÇÃO AUXILIAR - HIGIENIZAÇÃO DE TEXTO PARA JSON
' ----------------------------------------------------
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