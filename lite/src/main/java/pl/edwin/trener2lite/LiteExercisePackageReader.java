package pl.edwin.trener2lite;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONObject;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/** Odczyt bez zapisywania danych: CSV, XLSX, ZIP (CSV/XLSX + zdjęcia). Android API 21+. */
final class LiteExercisePackageReader {
    private static final int LIMIT_FILE=20*1024*1024;
    private static final int LIMIT_UNPACKED=34*1024*1024;
    private static final int LIMIT_ENTRY=8*1024*1024;
    private static final int LIMIT_XML=5*1024*1024;
    private static final int LIMIT_IMAGES=70;
    private static final int LIMIT_ROWS=250;
    private LiteExercisePackageReader(){}

    static JSONObject read(InputStream input,String filename) throws Exception{
        if(input==null)throw new IllegalArgumentException("Nie można otworzyć pliku.");
        byte[] bytes=limited(input,LIMIT_FILE);
        String name=filename==null?"":filename.toLowerCase(Locale.ROOT).trim();
        JSONObject result;
        if(name.endsWith(".csv")||name.endsWith(".txt")){
            result=new JSONObject();result.put("kind","csv");
            result.put("rows",toRows(parseCsv(new String(bytes,StandardCharsets.UTF_8))));
            result.put("images",new JSONObject());
        }else if(name.endsWith(".xlsx")){
            Map<String,byte[]> entries=unzip(bytes);
            result=fromWorkbook(entries);
            result.put("kind","xlsx");
            result.put("images",extractPhotos(entries,"xl/media/"));
        }else if(name.endsWith(".zip")){
            Map<String,byte[]> entries=unzip(bytes);
            String source=null;
            for(String k:entries.keySet()){
                if(k.endsWith(".csv")&&!k.startsWith("__macosx/")){
                    if(source==null||k.compareTo(source)<0)source=k;
                }
            }
            if(source==null){
                for(String k:entries.keySet())if(k.endsWith(".xlsx")&&!k.startsWith("__macosx/")){
                    if(source==null||k.compareTo(source)<0)source=k;
                }
            }
            if(source==null)throw new IllegalArgumentException("ZIP musi zawierać arkusz .csv lub .xlsx.");
            if(source.endsWith(".csv")){
                result=new JSONObject();result.put("rows",toRows(parseCsv(new String(entries.get(source),StandardCharsets.UTF_8))));
            }else result=fromWorkbook(unzip(entries.get(source)));
            result.put("kind","zip");
            result.put("source",source);
            result.put("images",extractPhotos(entries,""));
        }else throw new IllegalArgumentException("Wybierz .csv, .xlsx lub .zip.");
        if(result.getJSONArray("rows").length()==0)throw new IllegalArgumentException("Nie znaleziono wierszy ćwiczeń.");
        if(result.toString().length()>6500000)
            throw new IllegalArgumentException("Paczka jest za duża do podglądu na tablecie. Podziel ją na mniejsze części.");
        result.put("format","trener2-lite-exercises");
        return result;
    }
    private static byte[] limited(InputStream in,int max) throws Exception{
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        byte[] buf=new byte[8192];int n;
        while((n=in.read(buf))!=-1){
            if(out.size()+n>max)throw new IllegalArgumentException("Plik lub element archiwum przekracza dozwolony rozmiar.");
            out.write(buf,0,n);
        }
        return out.toByteArray();
    }
    private static Map<String,byte[]> unzip(byte[] data)throws Exception{
        Map<String,byte[]> entries=new java.util.TreeMap<>();
        int total=0;
        try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(data))){
            ZipEntry e;
            while((e=zip.getNextEntry())!=null){
                if(e.isDirectory())continue;
                if(entries.size()>=250)throw new IllegalArgumentException("Archiwum zawiera zbyt wiele plików.");
                String key=clean(e.getName());
                if(key.length()==0||entries.containsKey(key))throw new IllegalArgumentException("Niepoprawna lub powtórzona ścieżka w ZIP.");
                byte[] contents=limited(zip,LIMIT_ENTRY);
                total+=contents.length;
                if(total>LIMIT_UNPACKED)throw new IllegalArgumentException("Archiwum jest zbyt duże po rozpakowaniu.");
                entries.put(key,contents);zip.closeEntry();
            }
        }
        return entries;
    }
    private static String clean(String s){
        if(s==null)return "";
        String n=s.replace('\\','/').trim().toLowerCase(Locale.ROOT);
        if(n.startsWith("/")||n.contains("../")||n.equals("..")||n.contains(":/")||n.contains("\u0000"))
            throw new IllegalArgumentException("Niedozwolona ścieżka w archiwum.");
        return n;
    }
    private static Document xml(byte[] raw)throws Exception{
        if(raw==null||raw.length>LIMIT_XML)throw new IllegalArgumentException("Brak lub zbyt duży arkusz XML.");
        DocumentBuilderFactory factory=DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(false);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities",false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd",false);
        factory.setXIncludeAware(false);factory.setExpandEntityReferences(false);
        try{factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD,"");}catch(Exception ignored){}
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(raw));
    }
    private static List<Element> elems(Element parent,String tag){
        NodeList list=parent.getElementsByTagName(tag);
        List<Element> out=new ArrayList<>();
        for(int i=0;i<list.getLength();i++)if(list.item(i) instanceof Element)out.add((Element)list.item(i));
        return out;
    }
    private static String text(Element p,String tag){
        NodeList elems=p.getElementsByTagName(tag);
        return elems.getLength()>0?elems.item(0).getTextContent():"";
    }
    private static JSONObject fromWorkbook(Map<String,byte[]> xlsx)throws Exception{
        if(!xlsx.containsKey("xl/workbook.xml"))throw new IllegalArgumentException("Nieprawidłowy plik XLSX.");
        String firstSheet="";
        // Obsługujemy pierwszy arkusz. Excel zapisuje je jako sheet1.xml itd.
        for(String k:xlsx.keySet())if(k.matches("xl/worksheets/sheet[0-9]+\\.xml")){
            firstSheet=k;break;
        }
        if(firstSheet.isEmpty())throw new IllegalArgumentException("Nie znaleziono arkusza Excel.");
        List<String> shared=new ArrayList<>();
        if(xlsx.containsKey("xl/sharedstrings.xml")){
            Document strings=xml(xlsx.get("xl/sharedstrings.xml"));
            for(Element si:elems(strings.getDocumentElement(),"si")){
                StringBuilder b=new StringBuilder();
                for(Element t:elems(si,"t"))b.append(t.getTextContent());
                shared.add(b.toString());
                if(shared.size()>20000)throw new IllegalArgumentException("Zbyt duża tabela tekstów XLSX.");
            }
        }
        List<List<String>> rows=new ArrayList<>();
        Document sheet=xml(xlsx.get(firstSheet));
        for(Element row:elems(sheet.getDocumentElement(),"row")){
            if(rows.size()>LIMIT_ROWS+2)throw new IllegalArgumentException("Arkusz zawiera zbyt wiele wierszy.");
            List<String> cols=new ArrayList<>();
            for(Element c:elems(row,"c")){
                String ref=c.getAttribute("r");int ix=0;
                while(ix<ref.length()&&Character.isLetter(ref.charAt(ix)))ix++;
                int col=0;
                for(int j=0;j<ix;j++)col=col*26+(Character.toUpperCase(ref.charAt(j))-'A'+1);
                col=Math.max(0,col-1);
                if(col>45)continue;
                while(cols.size()<=col)cols.add("");
                String val="inlineStr".equals(c.getAttribute("t"))?text(c,"t"):text(c,"v");
                if("s".equals(c.getAttribute("t"))){
                    int n=Integer.parseInt(val.isEmpty()?"-1":val);
                    if(n<0||n>=shared.size())throw new IllegalArgumentException("Uszkodzone odwołanie do tekstu XLSX.");
                    val=shared.get(n);
                }
                cols.set(col,val);
            }
            rows.add(cols);
        }
        JSONObject output=new JSONObject();
        output.put("rows",toRows(rows));
        return output;
    }
    private static List<List<String>> parseCsv(String text){
        if(text.startsWith("\uFEFF"))text=text.substring(1);
        char sep=';';
        String first=text.split("\r?\n",2)[0];
        int semis=count(first,';'),commas=count(first,','),tabs=count(first,'\t');
        if(tabs>semis&&tabs>commas)sep='\t';
        else if(commas>semis)sep=',';
        List<List<String>> rows=new ArrayList<>();List<String> line=new ArrayList<>();StringBuilder val=new StringBuilder();
        boolean quoted=false;
        for(int i=0;i<text.length();i++){
            char c=text.charAt(i);
            if(c=='"'){
                if(quoted&&i+1<text.length()&&text.charAt(i+1)=='"'){val.append('"');i++;}
                else quoted=!quoted;
            }else if(c==sep&&!quoted){line.add(val.toString());val.setLength(0);}
            else if((c=='\r'||c=='\n')&&!quoted){
                if(c=='\r'&&i+1<text.length()&&text.charAt(i+1)=='\n')i++;
                line.add(val.toString());val.setLength(0);
                rows.add(line);line=new ArrayList<>();
                if(rows.size()>LIMIT_ROWS+2)throw new IllegalArgumentException("Plik ma zbyt wiele wierszy.");
            }else val.append(c);
        }
        if(quoted)throw new IllegalArgumentException("Błędny cudzysłów w CSV.");
        if(val.length()>0||!line.isEmpty()){line.add(val.toString());rows.add(line);}
        return rows;
    }
    private static int count(String s,char c){int n=0;for(int i=0;i<s.length();i++)if(s.charAt(i)==c)n++;return n;}
    private static JSONArray toRows(List<List<String>> table)throws Exception{
        if(table.size()<2)throw new IllegalArgumentException("Brak nagłówków i wierszy ćwiczeń.");
        List<String> headers=table.get(0);
        if(headers.size()>46)throw new IllegalArgumentException("Zbyt wiele kolumn.");
        JSONArray rows=new JSONArray();
        for(int i=1;i<table.size();i++){
            List<String> line=table.get(i);
            JSONObject row=new JSONObject();boolean nonempty=false;
            for(int j=0;j<headers.size();j++){
                String key=headers.get(j).trim().toLowerCase(Locale.ROOT);
                if(key.isEmpty())continue;
                String value=j<line.size()?line.get(j).trim():"";
                if(!value.isEmpty())nonempty=true;
                row.put(key,value);
            }
            if(nonempty)rows.put(row);
        }
        return rows;
    }
    private static JSONObject extractPhotos(Map<String,byte[]> files,String prefix)throws Exception{
        JSONObject photos=new JSONObject();int count=0,chars=0;
        for(Map.Entry<String,byte[]> e:files.entrySet()){
            String name=e.getKey();if(!name.startsWith(prefix))continue;
            if(!(name.endsWith(".jpg")||name.endsWith(".jpeg")||name.endsWith(".png")||name.endsWith(".webp")))continue;
            if(++count>LIMIT_IMAGES)throw new IllegalArgumentException("ZIP ma ponad 70 zdjęć. Podziel paczkę.");
            byte[] contents=e.getValue();
            BitmapFactory.Options options=new BitmapFactory.Options();
            options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(contents,0,contents.length,options);
            if(options.outWidth<1||options.outHeight<1||options.outWidth>14000||options.outHeight>14000)
                throw new IllegalArgumentException("Niepoprawne zdjęcie: "+name);
            options.inJustDecodeBounds=false;
            options.inSampleSize=1;
            while(options.outWidth/options.inSampleSize>640||options.outHeight/options.inSampleSize>640)
                options.inSampleSize*=2;
            Bitmap decoded=BitmapFactory.decodeByteArray(contents,0,contents.length,options);
            if(decoded==null)throw new IllegalArgumentException("Nie udało się odczytać: "+name);
            Bitmap bitmap=decoded;
            int max=Math.max(decoded.getWidth(),decoded.getHeight());
            if(max>480){
                bitmap=Bitmap.createScaledBitmap(decoded,Math.max(1,decoded.getWidth()*480/max),
                    Math.max(1,decoded.getHeight()*480/max),true);
                decoded.recycle();
            }
            ByteArrayOutputStream out=new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG,55,out);bitmap.recycle();
            if(out.size()>130000)throw new IllegalArgumentException("Zdjęcie zbyt duże po kompresji: "+name);
            String data="data:image/jpeg;base64,"+Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP);
            chars+=data.length();if(chars>4800000)
                throw new IllegalArgumentException("Za dużo zdjęć na jeden import. Podziel paczkę.");
            photos.put(name,data);
        }
        return photos;
    }
}
