Sub PreencherCustosSemLote()
    Dim cn As Object
    Dim rs As Object
    Dim strSql As String
    Dim strConn As String
    Dim ws As Worksheet
    Dim rng As Range
    Dim cell As Range
    
    Set cn = CreateObject("ADODB.Connection")
    Set ws = ThisWorkbook.Sheets("Dezembro")
    
    strConn = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=\\10.0.0.2\SupraSGC\Analytics\Custos\custos.accdb;"
    cn.Open strConn
    
    Set rng = ws.Range("R3:R" & ws.Cells(ws.Rows.Count, "R").End(xlUp).Row)
    
    For Each cell In rng
        If IsEmpty(cell) Then
            strSql = "SELECT TOP 1 custo FROM custos WHERE codigo = " & ws.Cells(cell.Row, "I").Value & " ORDER BY chave DESC"
            Set rs = cn.Execute(strSql)
            If Not rs.EOF Then
                cell.Value = rs.Fields("custo").Value
            End If
        End If
    Next cell
    
    rs.Close
    Set rs = Nothing
    cn.Close
    Set cn = Nothing
End Sub