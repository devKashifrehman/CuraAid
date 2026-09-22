$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function XmlEscape([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;')
}

function Get-PngSize([string]$path) {
  $b = [IO.File]::ReadAllBytes($path)
  $w = ($b[16] -shl 24) + ($b[17] -shl 16) + ($b[18] -shl 8) + $b[19]
  $h = ($b[20] -shl 24) + ($b[21] -shl 16) + ($b[22] -shl 8) + $b[23]
  return @{ W = [int]$w; H = [int]$h }
}

function Convert-Inline([string]$text) {
  $text = $text -replace '\[([^\]]+)\]\([^)]+\)', '$1'
  $sb = New-Object System.Text.StringBuilder
  $rx = [regex]'(\*\*[^*]+\*\*|`[^`]+`|[^*`]+)'
  foreach ($m in $rx.Matches($text)) {
    $t = $m.Value
    if ($t.StartsWith('**') -and $t.EndsWith('**') -and $t.Length -ge 4) {
      $inner = XmlEscape $t.Substring(2, $t.Length - 4)
      [void]$sb.Append("<w:r><w:rPr><w:b/></w:rPr><w:t xml:space=`"preserve`">$inner</w:t></w:r>")
    } elseif ($t.StartsWith('`') -and $t.EndsWith('`') -and $t.Length -ge 2) {
      $inner = XmlEscape $t.Substring(1, $t.Length - 2)
      [void]$sb.Append("<w:r><w:rPr><w:rFonts w:ascii=`"Consolas`" w:hAnsi=`"Consolas`"/><w:sz w:val=`"20`"/></w:rPr><w:t xml:space=`"preserve`">$inner</w:t></w:r>")
    } else {
      $inner = XmlEscape $t
      [void]$sb.Append("<w:r><w:t xml:space=`"preserve`">$inner</w:t></w:r>")
    }
  }
  if ($sb.Length -eq 0) {
    return "<w:r><w:t xml:space=`"preserve`">$(XmlEscape $text)</w:t></w:r>"
  }
  return $sb.ToString()
}

function Para([string]$inner, [string]$style) {
  return "<w:p><w:pPr><w:pStyle w:val=`"$style`"/><w:spacing w:after=`"160`"/></w:pPr>$inner</w:p>"
}

function BodyPara([string]$inner) {
  return "<w:p><w:pPr><w:spacing w:after=`"140`" w:line=`"276`" w:lineRule=`"auto`"/></w:pPr>$inner</w:p>"
}

function Convert-MarkdownToDocx([string]$mdPath, [string]$outPath, [string]$title) {
  $imgDir = Join-Path (Split-Path $mdPath -Parent) 'images'
  $lines = [IO.File]::ReadAllLines($mdPath)
  $body = New-Object System.Text.StringBuilder
  $rels = New-Object System.Text.StringBuilder
  $media = @()
  $relSeq = 2
  $imgIndex = 0
  $inCode = $false
  $codeBuf = New-Object System.Collections.Generic.List[string]
  $i = 0

  [void]$rels.AppendLine('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>')

  while ($i -lt $lines.Length) {
    $line = $lines[$i]

    if ($line -match '^```') {
      if ($inCode) {
        $codeText = XmlEscape (($codeBuf -join "`n"))
        [void]$body.Append("<w:p><w:pPr><w:shd w:val=`"clear`" w:fill=`"F3F4F6`"/><w:spacing w:after=`"160`"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii=`"Consolas`" w:hAnsi=`"Consolas`"/><w:sz w:val=`"18`"/></w:rPr><w:t xml:space=`"preserve`">$codeText</w:t></w:r></w:p>")
        $codeBuf.Clear()
        $inCode = $false
      } else {
        $inCode = $true
      }
      $i++
      continue
    }
    if ($inCode) { $codeBuf.Add($line); $i++; continue }

    if ($line -match '^---+\s*$') { $i++; continue }

    if ($line -match '^# (.+)$') {
      [void]$body.Append((Para (Convert-Inline $Matches[1]) 'Title'))
      $i++; continue
    }
    if ($line -match '^## (.+)$') {
      [void]$body.Append((Para (Convert-Inline $Matches[1]) 'Heading1'))
      $i++; continue
    }
    if ($line -match '^### (.+)$') {
      [void]$body.Append((Para (Convert-Inline $Matches[1]) 'Heading2'))
      $i++; continue
    }

    if ($line -match '^!\[([^\]]*)\]\(([^)]+)\)') {
      $alt = $Matches[1]
      $rel = $Matches[2] -replace '\\', '/'
      $fileName = Split-Path $rel -Leaf
      $imgPath = Join-Path $imgDir $fileName
      if (Test-Path $imgPath) {
        $imgIndex++
        $relSeq++
        $relName = "rId$relSeq"
        $mediaName = "image$imgIndex.png"
        $media += @{ Path = $imgPath; Name = $mediaName }
        [void]$rels.AppendLine("<Relationship Id=`"$relName`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image`" Target=`"media/$mediaName`"/>")
        $sz = Get-PngSize $imgPath
        $maxCx = 5638800L
        $cx = [int64]([Math]::Round($sz.W * 9525.0))
        $cy = [int64]([Math]::Round($sz.H * 9525.0))
        if ($cx -gt $maxCx) {
          $scale = $maxCx / $cx
          $cx = $maxCx
          $cy = [int64]([Math]::Round($cy * $scale))
        }
        $docPrId = $imgIndex
        if ($alt) {
          [void]$body.Append((BodyPara (Convert-Inline ("Figure: " + $alt))))
        }
        [void]$body.Append(@"
<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>
<w:r>
  <w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="$cx" cy="$cy"/>
      <wp:docPr id="$docPrId" name="$mediaName"/>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr>
              <pic:cNvPr id="0" name="$mediaName"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="$relName"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="$cx" cy="$cy"/>
              </a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing>
</w:r>
</w:p>
"@)
      }
      $i++; continue
    }

    if ($line -match '^\|') {
      $rows = @()
      while ($i -lt $lines.Length -and $lines[$i] -match '^\|') {
        $raw = $lines[$i].Trim()
        if ($raw -notmatch '^\|?\s*:?-+') {
          $cells = @($raw.Trim('|').Split('|') | ForEach-Object { $_.Trim() })
          $rows += ,$cells
        }
        $i++
      }
      if ($rows.Count -gt 0) {
        $cols = ($rows | ForEach-Object { $_.Count } | Measure-Object -Maximum).Maximum
        $tblW = 9360
        $cellW = [int]($tblW / $cols)
        [void]$body.Append("<w:tbl><w:tblPr><w:tblW w:w=`"$tblW`" w:type=`"dxa`"/><w:tblBorders><w:top w:val=`"single`" w:sz=`"4`" w:color=`"CBD5E1`"/><w:left w:val=`"single`" w:sz=`"4`" w:color=`"CBD5E1`"/><w:bottom w:val=`"single`" w:sz=`"4`" w:color=`"CBD5E1`"/><w:right w:val=`"single`" w:sz=`"4`" w:color=`"CBD5E1`"/><w:insideH w:val=`"single`" w:sz=`"4`" w:color=`"CBD5E1`"/><w:insideV w:val=`"single`" w:sz=`"4`" w:color=`"CBD5E1`"/></w:tblBorders></w:tblPr><w:tblGrid>")
        for ($c = 0; $c -lt $cols; $c++) { [void]$body.Append("<w:gridCol w:w=`"$cellW`"/>") }
        [void]$body.Append('</w:tblGrid>')
        for ($r = 0; $r -lt $rows.Count; $r++) {
          $fill = if ($r -eq 0) { '0EA5E9' } else { if ($r % 2 -eq 0) { 'F8FAFC' } else { 'FFFFFF' } }
          $color = if ($r -eq 0) { 'FFFFFF' } else { '0F172A' }
          [void]$body.Append('<w:tr>')
          $row = $rows[$r]
          for ($c = 0; $c -lt $cols; $c++) {
            $cell = if ($c -lt $row.Count) { $row[$c] } else { '' }
            $runs = Convert-Inline $cell
            if ($r -eq 0) {
              $runs = "<w:r><w:rPr><w:b/><w:color w:val=`"FFFFFF`"/></w:rPr><w:t xml:space=`"preserve`">$(XmlEscape $cell)</w:t></w:r>"
            }
            [void]$body.Append("<w:tc><w:tcPr><w:tcW w:w=`"$cellW`" w:type=`"dxa`"/><w:shd w:val=`"clear`" w:fill=`"$fill`"/></w:tcPr><w:p><w:pPr><w:spacing w:after=`"40`"/></w:pPr>$runs</w:p></w:tc>")
          }
          [void]$body.Append('</w:tr>')
        }
        [void]$body.Append('</w:tbl>')
        [void]$body.Append('<w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>')
      }
      continue
    }

    if ($line -match '^\s*$') { $i++; continue }

    if ($line -match '^[-*] (.+)$') {
      [void]$body.Append("<w:p><w:pPr><w:pStyle w:val=`"ListBullet`"/><w:spacing w:after=`"60`"/></w:pPr>$(Convert-Inline $Matches[1])</w:p>")
      $i++; continue
    }
    if ($line -match '^\d+\. (.+)$') {
      [void]$body.Append("<w:p><w:pPr><w:pStyle w:val=`"ListNumber`"/><w:spacing w:after=`"60`"/></w:pPr>$(Convert-Inline $Matches[1])</w:p>")
      $i++; continue
    }

    [void]$body.Append((BodyPara (Convert-Inline $line)))
    $i++
  }

  $ns = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"'
  $documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document $ns>
  <w:body>
    $($body.ToString())
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

  $stylesXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="0F172A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="0284C7"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="280" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/><w:color w:val="0369A1"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/><w:spacing w:before="200" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/><w:color w:val="0EA5E9"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListNumber"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr></w:style>
</w:styles>
'@

  $numberingXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
'@

  [void]$rels.AppendLine('<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>')

  $docRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
$($rels.ToString())
</Relationships>
"@

  $rootRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'@

  $overrides = ""
  foreach ($m in $media) {
    # png default covers these
  }

  $contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"@

  $now = [DateTime]::UtcNow.ToString('s') + 'Z'
  $core = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>$([System.Security.SecurityElement]::Escape($title))</dc:title>
  <dc:creator>CuraAid</dc:creator>
  <cp:lastModifiedBy>CuraAid</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">$now</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">$now</dcterms:modified>
</cp:coreProperties>
"@
  $app = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>CuraAid Manual Builder</Application>
</Properties>
'@

  if (Test-Path $outPath) { Remove-Item $outPath -Force }
  $zip = [System.IO.Compression.ZipFile]::Open($outPath, 'Create')
  function Add-TextEntry($zipObj, $name, $text) {
    $entry = $zipObj.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
    $sw = New-Object IO.StreamWriter($entry.Open(), [Text.UTF8Encoding]::new($false))
    $sw.Write($text)
    $sw.Dispose()
  }
  Add-TextEntry $zip '[Content_Types].xml' $contentTypes
  Add-TextEntry $zip '_rels/.rels' $rootRels
  Add-TextEntry $zip 'word/document.xml' $documentXml
  Add-TextEntry $zip 'word/_rels/document.xml.rels' $docRels
  Add-TextEntry $zip 'word/styles.xml' $stylesXml
  Add-TextEntry $zip 'word/numbering.xml' $numberingXml
  Add-TextEntry $zip 'docProps/core.xml' $core
  Add-TextEntry $zip 'docProps/app.xml' $app
  foreach ($m in $media) {
    $entry = $zip.CreateEntry("word/media/$($m.Name)", [System.IO.Compression.CompressionLevel]::Optimal)
    $src = [IO.File]::OpenRead($m.Path)
    $dst = $entry.Open()
    $src.CopyTo($dst)
    $dst.Dispose(); $src.Dispose()
  }
  $zip.Dispose()
}

$root = 'C:\Users\root\Downloads\FYP'
Convert-MarkdownToDocx (Join-Path $root 'docs\manuals\USER_MANUAL.md') (Join-Path $root 'CuraAid User Manual.docx') 'CuraAid User Manual'
Convert-MarkdownToDocx (Join-Path $root 'docs\manuals\ADMIN_MANUAL.md') (Join-Path $root 'CuraAid Admin Manual.docx') 'CuraAid Administrator Manual'
Get-Item "$root\CuraAid User Manual.docx", "$root\CuraAid Admin Manual.docx" | Select-Object Name, Length, FullName
