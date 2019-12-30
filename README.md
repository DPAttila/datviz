Ez a vizualizáció a II. székelydata adatvizualizációs versenyre készült. A térképen a Románia es Magyarország meteorológiai állomásai által rögzített hőmérséklet, hómélység és csapadékmennyiség vizsgálható, napos felbontásban.<br>
      
<br>

<b>Hogy kell használni?</b>
<p>
Az egérrel húzogathatjuk a térképet és a görgővel ráközelíthetünk.<br><br>

Az ablak alsó részében található csúszkával vagy az alatta levő dátum input mezővel kiválasztjuk, hogy melyik dátumot vizsgáljuk.
A dátumot naponként előre és hátra tudjuk ugratni a jobbra és balra billentyűkkel.<br><br>

A bal felső sarokban lévő hőmérséklet, hómélység és csapadékmennyiség gombok segítségével kiválasztjuk, hogy milyen adatot szeretnénk vizsgálni. Ahol a térkép szürkén kockázott, ott nincs adat az adott napra.<br><br>

A bal felső sarokban levő kettéosztás gombbal két részre osztható a képernyő, így egyszerre két napot is vizsgálhatunk. (Ebben az esetben a nyilak mindkét dátumot léptetik)<br>
</p>

<b>Hogy működik?</b>
<p>
A térképet Delaunay-háromszögeléssel generáltam a meteorológiai állomások koordinátái alapján. (A háromszögeket megnézheted az élek bekapcsolásával a bal felső sarokban.)<br><br>

A vizualizáció a Three.js nevű, webgl alapú 3d-s könyvtár segítségével történik.<br><br>

Ha kiválasztunk egy dátumot, a szerver egy adatbázisból lekéri az adott nap mérési átlagát (hőmérséklet esetében), illetve maximumát (csapadék és hómélység esetében). Mivel a pontos adatokat csak a meteorológiai állomásoknál ismerjük, a közéjük eső területeken egy shader segítségével lineáris interpolációval számítjuk ki (tippeljük meg) az adatokat, így fenntartva a térkép színezésének folytonosságát.<br><br>

<a href="https://hu.wikipedia.org/wiki/Delaunay-h%C3%A1romsz%C3%B6gel%C3%A9s">Wikipedia cikk a Delaunay-háromszögelésről</a>
<br>
<a href="https://www.ti.inf.ethz.ch/ew/Lehre/CG13/lecture/Chapter%206.pdf">Leíras a Delaunay-haromszögelésről (angol nyelven)</a>
<br>
<a href="https://www.ti.inf.ethz.ch/ew/Lehre/CG13/lecture/Chapter%207.pdf">Az általam használt inkrementális algoritmus leírása (angol nyelven)</a>
<br>
<a href="https://threejs.org/">Three.js könyvtár</a> <br>
<br>
