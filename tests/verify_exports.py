"""Compare native PDF output with independently rendered editable DOCX pages."""
from collections import Counter
from pathlib import Path
from tempfile import TemporaryDirectory
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import re
import subprocess
import sys

folder=Path(sys.argv[1]).resolve()
names=['Test manuscript','Dialogue fixture','AV fixture']
def words(pdf):
    xml=subprocess.check_output(['pdftotext','-bbox',pdf,'-'])
    root=ET.fromstring(xml)
    return [Counter((w.text or '').strip() for w in page.findall('.//{*}word') if (w.text or '').strip()) for page in root.findall('.//{*}page')]
with TemporaryDirectory() as temporary:
    out=Path(temporary)/'pdf';out.mkdir()
    profile=Path(temporary)/'profile'
    subprocess.run(['libreoffice','--headless','-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',out,*[folder/(n+'.docx') for n in names]],check=True,timeout=100)
    for name in names:
        with ZipFile(folder/(name+'.docx')) as z:
            assert len([n for n in z.namelist() if n.endswith('.odttf')])==4
            doc=ET.fromstring(z.read('word/document.xml'))
            assert doc.findall('.//{*}t')
            if name=='AV fixture':assert doc.findall('.//{*}tbl')
        draft=words(folder/(name+'.pdf'))
        word=words(out/(name+'.pdf'))
        expectedfile=folder/(name+'.pages')
        expected=int(expectedfile.read_text()) if expectedfile.exists() else 1
        assert len(draft)==len(word)==expected,(name,len(draft),len(word),expected)
        for page,(a,b) in enumerate(zip(draft,word),start=1):
            assert a==b,(name,page,'PDF only',list((a-b).items())[:8],'Word only',list((b-a).items())[:8])
        print(name,expected,'pages; every printed word matches on each page.')
