Sub AtualizarCustosDatabase()
    Dim wsDezembro As Worksheet
    Dim wsVendas As Worksheet
    Dim lastRowDezembro As Long, lastRowVendas As Long
    Dim i As Long, j As Long
    Dim codigoProduto As Variant, custoProduto As Variant
    
    ' Definir as planilhas
    Set wsDezembro = ThisWorkbook.Sheets("Dezembro")
    Set wsVendas = ThisWorkbook.Sheets("database")
    
    ' Encontrar a última linha de dados em cada planilha
    lastRowDezembro = wsDezembro.Cells(wsDezembro.Rows.Count, "I").End(xlUp).Row
    lastRowVendas = wsVendas.Cells(wsVendas.Rows.Count, "I").End(xlUp).Row
    
    ' Percorrer cada linha da planilha "Dezembro"
    For i = 3 To lastRowDezembro
        If IsEmpty(wsDezembro.Cells(i, "R").Value) Or wsDezembro.Cells(i, "R").Value = 0 Then
            codigoProduto = wsDezembro.Cells(i, "I").Value ' Capturar o código do produto na coluna I
            
            ' Percorrer cada linha da planilha "Vendas_Dev Gerais"
            For j = 3 To lastRowVendas
                If wsVendas.Cells(j, "I").Value = codigoProduto Then ' Se o código do produto corresponder
                    custoProduto = wsVendas.Cells(j, "R").Value ' Capturar o custo do produto na coluna R
                    wsDezembro.Cells(i, "R").Value = custoProduto ' Colar o custo na planilha "Dezembro"
                    Exit For ' Sair do loop interno, pois já encontramos o custo para esse produto
                End If
            Next j
        End If
    Next i
End Sub