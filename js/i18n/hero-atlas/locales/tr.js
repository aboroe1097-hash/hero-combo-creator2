const skills = {
  'Immortal:2': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Düşman',
    desc: 'Normal bir saldırının ardından, geçerli menzil içindeki rastgele 1 düşman ekibine 2 kez saldırmak için 40% şans vardır; her saldırı 348% hasar verir.',
  },
  'Immortal:5': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Düşman',
    desc: "Normal bir saldırıdan sonra: Menzil içindeki 1 rastgele düşman ekibine 465% hasar verme ve 1 tur boyunca savaş becerisini kullanamayan düşman ekibine Sessizlik statüsü verme şansı 34%'tür.",
  },
  'Immortal:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kahramanın bulunduğu lejyonun hasarını 80% artırın.',
  },
  'Wind-Walker:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Birlik normal saldırı yaptığında İlk Yardım kazanır ve her tur asker gücü yeniler (iyileşme oranı: 20%). Etki 2 tur sürer ve 8 defaya kadar birikir.',
  },
  'Wind-Walker:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "Menzil içindeki 2 düşman ekibine 331% hasar verme ve kendi manganıza 331% hasar verme şansı 60%'tır.",
  },
  'Wind-Walker:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '50% olasılıkla menzil içindeki rastgele 2 düşman birliğini 2 tur boyunca Kışkırtır; birlik karşı saldırı durumuna girer ve normal saldırı aldığında 150% karşı hasar verir. Direnci 100% artırır; etki 2 tur sürer.',
  },
  'Hunk:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Ekip hasar aldığında, kaçma şansı 25% (bu hasara karşı bağışıklık), her turda 50% şans, ekip hasarını 50% artırır.',
  },
  'Hunk:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "2 rastgele düşman ekibinin Şaşırt (beceri ve temel saldırılar rastgele hedefleri hedef alır) ve Yanıcı (50% ek yanma hasarı alır) durumuna girme şansı 30%'dur, 2 tur sürer.",
  },
  'Hunk:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: "İlk 6 tur, Tüm dost takımların savaş hızı 37 artar, alınan hasarın 50%'si 7. turda hesaplanır, savaş öncesi tur 2 rastgele düşmana 469% hasar verir.",
  },
  'Sakura:2': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'İlk 2 turda, 2 rastgele düşman ilk önce hareket edecek, ikinci turda 2 rastgele ila 2 rastgele düşman ekibine 687% hasar verecek.',
  },
  'Sakura:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: 'İlk 3 turda rastgele 2 düşman ekibi 50% ek hasar alır.',
  },
  'Sakura:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'İlk 3 turda rastgele 2 dost okçu ekibi 50% ek hasar verir.',
  },
  'ELK:2': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "İlk 3 turda, ön sıradaki Okçu ekibinin karşı saldırı durumuna girme şansı 70%'tir ve bu, temel saldırı sırasında kaynağa 250% geri dönüş hasarı verir.",
  },
  'ELK:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: '1/3/5 turunda, geçerli aralık içindeki 3 rastgele düşman ekibine 220% Hasar verme ve hedefe Savunmasız durumunu uygulama ve hedefin 1 tur süren önceki turdan 15% daha fazla Hasar almasını sağlama şansı: 100%.',
  },
  'ELK:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'İlk üç turda rastgele 2 dost birlik 70% olasılıkla Soğukkanlı olur (Susturma, Silahsızlandırma, Bastırma ve Şaşırtmaya bağışık) ve Kudreti 55% artar.',
  },
  'Mary Tudor:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: "Geçerli aralıktaki 1 rastgele düşman ekibine 325% Hasar verme şansı 60%; hedefin birlik gücü 50%'den düşükse 195% daha fazla hasar verilecektir.",
  },
  'Mary Tudor:5': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: 'Mary I, bir savaş becerisi kullandığında, ekibi +25% Beceri Hasarı verir (6 defaya kadar istiflenebilir) ve savaş bitene kadar sürer.',
  },
  'Mary Tudor:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '1 tur hazırlık. Geçerli aralık içindeki 2 rastgele düşman ekibine 368% Hasar verme ve onları kanama durumuna sokma şansı: 50% şans, 2 tur süren her turun başında harekete geçmeden önce 155% Hasar almalarını sağlar.',
  },
  'Cicero:2': {
    type: 'Ek Saldırı',
    target: '2 Rastgele Düşman',
    desc: 'Temel saldırılardan sonra, menzil içindeki 2 rastgele düşman ekibine 30% şansla 310% hasar vererek onların 2 tur boyunca 20% ek hasar almalarını sağlar.',
  },
  'Cicero:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '2 rastgele düşman ekibinin zırh kırma durumuna girme şansı 60%, Daha düşük savunma -200%, 2 tur sürer.',
  },
  'Cicero:8': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "2 tur boyunca alınan sonraki 3 hasardan 100% kaçınma şansına sahip olmak için ön sırada yer alma şansı 50%'dir.",
  },
  'Beowulf:2': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: 'Her normal saldırıdan sonra, kahramanın normal saldırısının neden olduğu hasar 20% artacak ve 5 katmana kadar istiflenebilir; İstiflenebilir sınıra ulaştıktan sonra kahraman Toplu Saldırı durumuna girer ve normal saldırıda hedef dışındaki iki düşman ekibine 260% + "Ateşli" etkisinin katman sayısı *50%\'ye eşit bir miktar hasar verir; etki Kritik Hasara neden olabilir; bu arada, hasar verirken düşmanın Kaçma durumunu görmezden gelme şansı 100%\'dür.',
  },
  'Beowulf:5': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Düşman',
    desc: 'Başlatılan her 2 normal saldırı için, kahramanın ve 1 rastgele dost manganın/birliklerin bir miktar birlik gücünü yeniler (iyileşme oranı: 75%) ve 1 rastgele düşman birliğine 350% Fiziksel Hasar verir (Ölümcül Darbeyi tetikleyebilir), hedef düşman birliğini/birliklerini 1 tur boyunca Silahsız durumuna geçirir.',
  },
  'Beowulf:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: 'Ölümcül Darbe olasılığı 20% artar. Her iyileştirme aldığında Hararet etkisi ve ek 10% Ölümcül Darbe olasılığı kazanır (Hararet en fazla 8 kez birikir); etkiler savaşın sonuna kadar sürer. Ayrıca 90% olasılıkla tüm olumsuz durumları temizler, Soğukkanlı olur ve bir sonraki hamlesine kadar kontrol etkilerine bağışıklık kazanır.',
  },
  'Theodora:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kahramanların kadrosu hariç 1 rastgele dost mangaya 20% beceri hasarı verme şansı 60%, bu da hedef mangaların 2 tur boyunca 50% daha fazla hasar vermesini sağlar.',
  },
  'Theodora:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman',
    desc: "Kahraman hasar aldığında, tüm düşman mangalarına 160% Beceri Hasarı verme şansı 40%'tır ve onları 2 tur süren, Bastırılmış/Susturulmuş/Silahsızlandırılmış/Kafası Karışık arasından 1 rastgele duruma sokma şansı 40%'tır.",
  },
  'Theodora:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "Öndeki alt takım hasar verdiğinde, 6 tur sürecek şekilde takımın birlik gücünün bir kısmını verilen hasarın 60%'ına kadar geri yükleyin; etki bir turda en fazla 2 defa etkili olabilir. Ön sıradaki ekip öldüğünde kahraman 1 tur daha savaşır (bu etki Bölge Muhafızlarına karşı yapılan savaşlarda geçerli değildir).",
  },
  'Caesar:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Müttefik',
    desc: "3. turdan başlayarak Caesar'ın her turda 40% beceri kullanma şansı vardır, bu da tüm Süvari takımlarınızın Kudret ve Dirençlerini 200% ve Hasarını 60% artırır. Bu arada Sezar'ın, savaş bitene kadar sürecek ek saldırılar başlatma şansı 20% daha fazladır (bu beceri yalnızca bir kez kullanılabilir). Her turda bu beceriyi kullanma şansı 20% artar.",
  },
  'Caesar:5': {
    type: 'Ek Saldırı',
    target: '2 Rastgele Düşman',
    desc: "Normal bir saldırının ardından, rastgele 2 düşman ekibine Fiziksel hasar verme şansı (hasar oranı: 480%) 60%'tır. Hasarın 50%'si, tarafınızdaki rastgele 2 manganın birlik gücünü yenilemek için kullanılacaktır. Beceri, kullanıldıktan sonra 1 turluk bir bekleme süresine sahip olacaktır. Her turda ilk kez hasardan kaçındığınızda, bu kez herhangi bir bekleme süresi tetiklenmeden, beceriyi kullanma şansı 100%'dür.",
  },
  'Caesar:8': {
    type: 'Ek Saldırı',
    target: '3 Rastgele Düşman',
    desc: 'Normal bir saldırının ardından, 2-3 ekibe Fiziksel Hasar verme şansı 50% (hasar oranı: 310%); Dikte Eden Cetvelin hasar oranı, beceri her kullanıldığında 1 kat artacaktır; bu etki birikebilir ve savaşın sonuna kadar devam edebilir (bu beceri tur başına yalnızca bir kez tetiklenebilir).',
  },
  'Octavius:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Octavius her tur 80% olasılıkla Kışkırtma kazanır. Düşmanın aktif becerisi veya ek saldırısı rastgele bir birliği hedefleyeceğinde öncelikle Octavius seçilir. Bu becerinin tetiklenme olasılığı her tur 5% azalır.',
  },
  'Octavius:5': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: 'Octavius -25% hasar alır. Savaşın başında orta ve arka sıra birliklerine Kaçınma vererek sonraki 3 hasarı engeller; etki 2 tur sürer. Her hasar aldığında 100% olasılıkla rastgele 1 dost Süvari birliğinin Kudretini 30% artırır [en fazla 300%]. Bu etki her birlik için 10 katmana kadar birikir.',
  },
  'Octavius:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: "HP ilk kez 85%'in altına düştüğünde, tüm ekipleriniz 3 tur boyunca -50% beceri hasarı alacak; HP ilk kez 50%'nin altına düştüğünde, tüm düşman ekipleri anında bir miktar fiziksel hasar alacaktır (hasar oranı: 350%); HP ilk kez 25%'in altına düştüğünde, tüm düşman ekipleri anında bir miktar fiziksel hasar alacaktır (hasar oranı: 350%). Beceri her tetiklendiğinde, kendi Direncini 150% artıracaktır.",
  },
  'Boudica:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: "Boudica ileri atılıyor. Geçerli aralık içindeki 1 orta sıra veya arka sıradaki düşman ekibine art arda 3 kez 200% Hasar verme şansı 70%; Hasarın 40%'ı, tarafınızdaki rastgele 2 takımın gücünü yenilemek için kullanılacaktır.",
  },
  'Boudica:5': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Boudica kalıcı olarak doğal korumaya sahiptir. Beceri Hasarı verirken hedefe Yıkıcı Saldırı uygulama şansı 30%; Eğer Boudica tüm düşman takımlarından önce harekete geçerse, normal saldırılar yapmasını engellemek pahasına beceri ve Yıkıcı Saldırı yapma şansını 20% artırır.',
  },
  'Boudica:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Düşman',
    desc: "Savaştan önce, geçerli aralıktaki 2 rastgele düşman ekibini 5 mızrak işaretiyle işaretler; her işaret katmanı hedefin aldığı beceri hasarını 10% artıracaktır; bu arada hedefin aldığı tüm Hasar üzerindeki geciktirme etkisi göz ardı edilecektir; puanlar her turda 1 kat azaltılacaktır; Savaşlarda, en düşük birlik gücüne sahip düşman ekibine her turda 500% Büyük Hasar verme şansı 60%'tır.",
  },
  "Jeanne d'Arc:2": {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '1 tur hazırlık. Geçerli aralık içindeki 2 rastgele düşman ekibine 477% hasar verme ve ekiplerin 30% daha fazla Beceri Hasarı almasını sağlama şansı 50%.',
  },
  "Jeanne d'Arc:5": {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Müttefik',
    desc: '1 tur hazırlık. Rastgele 2 dost birliğe 65% olasılıkla Diriltilmiş durumu verir. Bu birlikler hasar aldığında 50% olasılıkla asker gücü yeniler (iyileşme oranı: 101%); etki 2 tur sürer.',
  },
  "Jeanne d'Arc:8": {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: "Savaşlarda, Süvari mangalarınızın hazırlık becerilerini kullanırken 1 hazırlık turunu atlama şansı 60% olacaktır (her turda her manga tarafından 1 defaya kadar tetiklenebilir); Bu arada, Kahramanın ekibinin verdiği Beceri Hasarını 1 tur boyunca 86% artırma şansı 80%'dir. Her etkinin sonucu bağımsız olarak belirlenecektir.",
  },
  'Alfred:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '35% olasılıkla geçerli menzildeki 2 düşman birliğine 335% Hasar verir ve hedefin birlik gücü yenileme etkisini -40% azaltır. Hedefin birlik gücü yenilemesi zaten engellenmiş veya kısıtlanmışsa hedef 2 tur boyunca 30% daha fazla Beceri Hasarı alır.',
  },
  'Alfred:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: 'Tüm takımlarınızın 95% hasar almasını sağlayacak fiyata, tüm düşman mangalarına 492% Büyük Hasar verme şansı 30%.',
  },
  'Alfred:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Alfred acil bir durumda görevi üstlenir. Ekibinin birlik gücü ilk kez 90%/70%/50%/30%'un altına düştüğünde, Alfred'in savaş becerisini kullanma şansı 50% daha fazla olur ve ekibi 1 tur boyunca 40% daha fazla beceri hasarı verir ve -35% hasar alır.",
  },
  'Ramses II:2': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: "İlk 2 turda, tüm düşmanlar ve ekipleriniz -45% Fiziksel Hasar alır; 3-6. turlarda tüm takımlarınızın her turda 2 kez normal saldırı yapma şansı 80%'dir.",
  },
  'Ramses II:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: "Savaşta tüm Okçu birlikleriniz 40% Ölümcül Darbe olasılığı kazanır; beceri bu oranı 60%'a kadar artırabilir. Üst sınırı aşan kısım 3 ile çarpılarak Ölümcül Darbe hasar oranına dönüştürülür.",
  },
  'Ramses II:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'Takımınız "Ölümcül Darbe"yi her tetiklediğinde, takıma bir miktar birlik gücü geri kazandırır (iyileşme oranı: 238%) ve Ölümcül Darbenin hasar oranını 80% [maksimum 560%] artırır (7 defaya kadar istiflenebilir), savaş bitene kadar sürer.',
  },
  'Cleopatra VII:2': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "İlk 4 turda, en düşük birlik gücüne sahip dost takımın, saldırıya uğradığında gelen hasardan kurtulma şansı 40%'tır; 4. turdan itibaren en düşük birlik gücüne sahip ekibiniz birlik gücünün bir kısmını yenileyecek (iyileşme oranı: 150%).",
  },
  'Cleopatra VII:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman',
    desc: 'Kleopatra düşmanı büyüler, sonuç olarak her düşman ekibinin yaptığı her 2 normal saldırı için ekibin kafasının karışması ve son 1 turda beceri/normal saldırısı için rastgele bir hedef seçmesi için 50% şansa sahip olur.',
  },
  'Cleopatra VII:8': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "Kahraman harekete geçtiğinde, kafası karışan düşman ekibinin savunmasız durumda kalmasını sağlama şansı 100%'dür; bu, her hasar aldığında sonraki seferde 15% daha fazla hasar alacağı anlamına gelir ve 2 tur sürer; bu arada anında 225% hasar alma şansı 50%'dir.",
  },
  'King Arthur:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Savaşın başlangıcında Kahramanın aldığı Hasar -80%. Kahramanın her Hasar aldığında, Hasar azaltma etkisi 8% azaltılacak, Direnç 20% artırılacak ve verilen Hasar 10% artırılacak (16 katmana kadar istiflenebilir), savaşın sonuna kadar geçerli olacaktır.',
  },
  'King Arthur:5': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Düşman',
    desc: "Arthur kutsal kılıcını kullanıyor; Normal bir saldırının ardından geçerli aralıktaki 1 rastgele düşman ekibine 700% Fiziksel Hasar verme şansı 50%'dir. Bu hasarın 40%'ı rastgele 2 dost manganın birlik gücünü yenilemek için kullanılacak. Taştaki Kılıç yeteneğini kullandıktan sonra, onu düşmanın orta veya arka sıra takımına ek olarak bir kez daha uygulama şansı 50%'dir.",
  },
  'King Arthur:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Arthur, aldığı iyileştirme etkilerini kalıcı olarak 15% oranında artıran bir lütuftur. Birliklerinizin verdiği her 6 kat hasar için Taştaki Kılıç'ın kullanılma şansı 4% artar; 5 katmana kadar birikir ve savaşın sonuna kadar sürer. Birikim sınırına ulaşıldığında 2 tur boyunca hasar verirken düşmanın Sıyrılma durumunu yok sayma şansı 100%'dür.",
  },
  'Leonidas:2': {
    type: 'Ek Saldırı',
    target: '2 Rastgele Düşman',
    desc: 'Normal bir saldırı başlattıktan sonra, geçerli aralıktaki 2 rastgele düşman ekibi için Kudret -50% ve Direnç -50% yapma ve ekipleri 1 tur boyunca Susturma şansı 40%.',
  },
  'Leonidas:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "Geçerli aralık içindeki 2-3 rastgele düşman ekibine 220% Hasar verme şansı 50%'dir.",
  },
  'Leonidas:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'İlk 2 turda tüm Okçu birlikleriniz her tur bir miktar birlik gücü yeniler (iyileşme oranı: 55%). 3. turdan itibaren tüm Okçu birlikleriniz -30% hasar alır ve savaşın sonuna kadar 5% Can Çalma kazanır.',
  },
  'Isabella I:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Her tur 70% olasılıkla rastgele 1 düşman birliğine 6 kez ejderha ateşi püskürtür ve 83% Yanma Hasarı verir. Tur içinde tüm düşman birlikleri vurulursa rastgele 1 dost birlik 1 tur boyunca Zihin Açıklığı kazanır ve Bastırma/Susturma/Silahsızlandırma/Şaşırtma etkilerine bağışık olur.',
  },
  'Isabella I:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: '3. turdan başlayarak, kalıcı olarak ateşte kalma pahasına, kahramanın ekibinin her turda 70% şansla 2 rastgele düşman ekibine 236% yanma hasarı verme şansı vardır ve bunların savaş beceri hasarı daha sonra -20% olacaktır.',
  },
  'Isabella I:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Beceri 2 sayesinde Soğukkanlı kalan birliklerinize, sonraki 2 hasarı -50% azaltan bir kalkan verir. Kahraman ilk kez Yanan duruma girdiğinde ön sıra birliğinizin asker gücünü büyük ölçüde yeniler (iyileşme oranı: 304) ve sonraki 1 tur boyunca geçerli menzildeki rastgele 1-2 düşman birliğini Bastırır.',
  },
  'Desert Storm:2': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman',
    desc: '1., 3. ve 5. turlarda tüm düşman birliklerine sırasıyla Lanetli, Yanma ve Zehirlenme uygular; ilgili turlarda 24%, 29% ve 34% hasar verir. Etkiler savaşın sonuna kadar sürer.',
  },
  'Desert Storm:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: '5. turun başından itibaren rastgele 2 dost birlik her tur asker gücü yeniler (iyileşme oranı: 60%).',
  },
  'Desert Storm:8': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Menzil içindeki bir düşman ekibine 243% hasar verme şansı 100% olup, yönlendirme becerilerini kesintiye uğratır.',
  },
  'Soaring Hawk:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "Menzil içindeki 2 rastgele düşman ekibine 179% hasar verme şansı 40%'tır ve bunların Kudreti -38% olur ve 2 tur sürer.",
  },
  'Soaring Hawk:5': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Kahraman ekibinin temel saldırı sırasında karşı saldırı yapma şansı 100%'dür ve saldıran kaynağa 120% hasar verir.",
  },
  'Soaring Hawk:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: "İlk 2 tur boyunca tüm dost birlikler -30% hasar alır. 3. turdan sonra kahramanın birliği hasar verdiğinde asker gücünün 30%'unu yeniler.",
  },
  'The Brave:2': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: "Savaşın ilk 3 turunda, her turda menzil içindeki 2 düşman ekibini Silahsızlandırma şansı 80%'dir.",
  },
  'The Brave:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '1 Tur hazırlığı, menzil içindeki 2 rastgele düşman ekibini susturmak için 30%, 2 tur sürer.',
  },
  'The Brave:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman',
    desc: 'Savaşta, tüm düşman mangaları -60% Kudret ve Direnç kaybeder, savaş hızı -100, alınan hasar 5% artar ve 5. turdan itibaren verilen hasar -5% artar, tüm süvari birlikleriniz 40% daha fazla hasar verir.',
  },
  'Jade Eagle:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Her biri geçerli aralık içindeki 2 rastgele düşman ekibine 142% Hasar veren 2 saldırı yapma şansı 40%, hedefleri 1 tur boyunca Susturmak için 25% şans.',
  },
  'Jade Eagle:4': {
    type: 'Liderlik Becerisi',
    target: 'Kahramanın Birliği',
    desc: 'Kahramanın Birliğindeki Okçular 60% daha fazla Kudret ve 20% daha fazla Hasar kazanır, ancak 20% daha fazla Hasar alır.',
  },
  'Jade Eagle:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: '1 tur hazırlık. 50% olasılıkla tüm düşman birliklerine 310% hasar verir. Düşman Piyadelerin asker gücü yenilenemez, düşman Süvarilerin Savaş Becerisi Hasarı -50% azalır ve düşman Okçular Silahsızlandırılır; etkiler 1 tur sürer.',
  },
  'Jade Eagle:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '2. ve 4. turlarda 100% olasılıkla menzildeki rastgele 3 düşman birliğine 863% Büyük Hasar verir. Hedef Silahsız veya Bastırılmışsa 40% daha fazla Hasar alır; etki 2 tur sürer.',
  },
  'Immortal Guardian:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kahramanın ekibinin Aldığı Hasar -30%',
  },
  'Immortal Guardian:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: 'Savaşta, menzil dahilindeki 2 rastgele düşman ekibi savaş becerilerini veya temel saldırıyı kullandığında, onlara -5% hasar verir, bu etki en fazla 8 kez birikir.',
  },
  'Immortal Guardian:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'İlk 3 tur boyunca tüm dost birliklerin aldığı Hasar -20% olur. Hasar aldıklarında 50% olasılıkla birlik gücü yenilerler (iyileşme oranı: 45%).',
  },
  'Divine Arrow:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Rastgele 2 düşmana 211% hasar verme ve onları 1 tur boyunca Silahsızlandırma şansı: 25%.',
  },
  'Divine Arrow:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "2 rastgele düşmanı birbirine bağlayan Zincir durumuna neden olma şansı 30%'dur; bir takım hasar aldığında diğeri de 2 tur sürecek şekilde 25% hasar alır.",
  },
  'Divine Arrow:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'Savaşta tüm dost Okçular Sıçrama kazanır; normal saldırılar arka sıradaki 2 düşman birliğine de 40% hasar verir.',
  },
  'Che Liu:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Takımın hasarı 50% artırıldı. Mevcut birlik yarıya indirildiğinde, 100% ilave Kudret ve Direnç kazanırsınız',
  },
  'Che Liu:5': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Düşman',
    desc: 'Temel Saldırılardan sonra menzil içindeki bir düşman ekibine 247% hasar verme şansı 100%',
  },
  'Che Liu:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Mevcut birlik gücü savaşın başlangıcındaki miktarın 50%'sinin altına düştüğünde iki normal saldırı gerçekleştirme şansı 100%'dür. Bu kahramanın takımı yenildiğinde veya morali bozulduğunda, bu Kahraman bir tur daha savaşmaya devam edecektir (Bölgelere saldırırken, Lejyon'un sadakati Asi Coşku'dan düşükse Kahraman savaşmaya devam edemeyecek).",
  },
  'War Lord:2': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'Savaş boyunca tüm dost Süvari birliklerinin normal saldırı hasarı -20%, Savaş Becerisi Hasarı ise 45% olur.',
  },
  'War Lord:5': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "İlk 2 turda, kahramanın ekibi her hasar aldığında, kaçma (Saçılma) ve bu hasardan kaçınma şansı 70%'tir.",
  },
  'War Lord:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "1, 3, 5 ve 7. turda rastgele 1 dost ekibin son savaş becerisini kullanma şansını 100%'e çıkarma şansı 100%. Beceri hazırlık gerektiriyorsa. 1 hazırlık turunu atlama şansı 60%.",
  },
  'Jane:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: '1 tur hazırlık Menzil içindeki tüm düşman ekiplerine 334.5% hasar verme şansı: 35%.',
  },
  'Jane:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: '30% olasılıkla menzildeki tüm düşman birliklerine 255% hasar verir ve asker güçlerinin yenilenmesini engeller; etki 2 tur sürer.',
  },
  'Jane:8': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Savaş sırasında kahraman ekibi, savaş becerisi hasarını 35% artırma karşılığında temel saldırı başlatamaz ve ayrıca menzil içindeki rastgele bir düşman ekibine 301% beceri hasarı verir.',
  },
  'Sky Breaker:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Rastgele 2 düşmana 325% hasar verme ve beceri hasarının 2 tur boyunca -20% vermesini sağlama şansı: 40%.',
  },
  'Sky Breaker:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman',
    desc: 'İlk 2 turda, 2 rastgele düşman ekibini silahsızlandırarak temel saldırı yapamaz hale getirir, 2. turda tüm düşman ekiplerine 267.5% hasar verir.',
  },
  'Sky Breaker:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '1 tur hazırlık. 50% olasılıkla rastgele 2 düşmana 260% hasar verir ve kendi birliğiyle rastgele bir dost birliğin asker gücünü yeniler (iyileşme oranı: 142%).',
  },
  'Rokuboshuten:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Rastgele 2 düşmana 255% hasar verme şansı 40%, onların Kudret ve Dirençlerini 2 tur sürecek şekilde -55% yapar.',
  },
  'Rokuboshuten:5': {
    type: 'Durum Becerisi',
    target: '2 Rastgele Müttefik',
    desc: 'Savaş boyunca hazırlık gerektiren bir beceri kullanıldığında kahramanın birliği 100% olasılıkla 2 tur Zihin Açıklığı kazanır; Susturma, Silahsızlandırma, Bastırma ve Şaşırtmaya bağışık olur. Bir Savaş Becerisi kullandıktan sonra 100% olasılıkla rastgele iki dost birliğin Kudret ve Direncini 100% artırır; etki 2 tur sürer.',
  },
  'Rokuboshuten:8': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: '1 tur hazırlık 40% şansla tüm düşmanlara 196.5% hasar verir, onları susturur, savaş becerilerini kullanamaz hale getirir ve 1 tur sürer.',
  },
  'Bleeding Steed:2': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'İlk 3 turda 2 dost takım 60% bonus hasara sahiptir.',
  },
  'Bleeding Steed:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "1 tur hazırlık. Rastgele 2 düşmanı Şaşırtma şansı 50%'dir, beceriler ve temel saldırı hedefleri rastgele hale gelir ve 2 tur sürer.",
  },
  'Bleeding Steed:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'Savaş sırasında tüm dost birlikler hasar aldığında 50% olasılıkla asker gücünün bir kısmını yeniler (iyileşme oranı: 33%).',
  },
  'Rozen Blade:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "Müttefik Süvarilerin ve okçuların zayıflatıcılarını kaldırma şansı 30% (savaş öncesi becerilerden gelen Zayıflatıcılar hariç), Temel Saldırılarına 1 tur süren 1 tur Bastırma'ya neden olma şansı 25% verir.",
  },
  'Rozen Blade:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'İlk 3 tur boyunca tüm dost birlikler 100 Savaş Hızı ve her tur 2 normal saldırı yapma şansı olarak 70% kazanır; aynı tür etkiler birikmez.',
  },
  'Rozen Blade:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: 'Savaş sırasında, rastgele 2 düşman ekibi hasar aldığında, maksimum 5 yük olmak üzere 12% ekstra hasar alırlar.',
  },
  'Jade:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: '1 Dönüş hazırlığı. 6 kez saldırma şansı 40%, her saldırı menzil içinde 162% Hasar veren bir düşman ekibini rastgele seçer.',
  },
  'Jade:5': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kahramanın bulunduğu takım hasarı 10% artırır. Bu etki her turda bir kez birikir.',
  },
  'Jade:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Etkili menzil içindeki 2 rastgele mangaya 160% hasar verme ve 2 tur boyunca savaş becerilerini kullandığında 80% hasara maruz kalacak bir düşman mangasına Lanet statüsü verme şansı: 40%.',
  },
  'Witch Hunter:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: 'Geçerli menzil içindeki tüm düşman takımlarına 237% hasar verme ve onlara Yanıcı statüsü vererek, aldıkları Yakma hasarını 2 tur boyunca 35% artırma şansı: 30%.',
  },
  'Witch Hunter:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: 'İlk üç turda rastgele 2 düşman birliğinin Savaş Becerisi Hasarı -75% olur. 90% olasılıkla 1 tur Sessizlik uygulayarak Savaş Becerisi kullanmalarını engeller.',
  },
  'Witch Hunter:8': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: 'Menzil içindeki 135% hasarla tüm takıma saldırma ve takıma yanma durumu verme, 142% hasar alma ve 2 tur boyunca kalma şansı: 40%.',
  },
  'Peace Bringer:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kahramanın ekibinin her turda 50% güçlendirme şansı vardır ve bu turlarda -50% daha az hasar alır. Kahramanın takımının temel saldırı sırasında 35% karşı saldırı şansı vardır ve hasar kaynağına 190% hasar verir.',
  },
  'Peace Bringer:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'İlk üç tur, tüm takımlar için verilen hasarı -45% azaltır, tüm takımımız alınan hasarı -20% azaltır, dördüncü turdan başlayarak savaşın sonuna kadar savaş beceri hasarımızı 20% artırır.',
  },
  'Peace Bringer:8': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: '30% olasılıkla menzildeki tüm düşman birliklerine 203% hasar verir ve Savunmasız uygular. Hedef her saldırı aldığında 20% ek hasar alır; etki 1 tur sürer.',
  },
  'Inquisitor:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: '1 tur hazırlık, menzil dahilindeki 246% hasar için tüm takıma saldırmak için 35% şans ve normal bir saldırı gerçekleştiremeyen düşman ekibine Silahsızlandırma durumunu verme, 2 tur sürer.',
  },
  'Inquisitor:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman',
    desc: 'Okçulardan alınan hasarı tüm düşman mangalarına 50% artırır.',
  },
  'Inquisitor:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "Menzil içindeki 2 rastgele ekibe 342% hasar verme şansı 35%, eğer hedef Yanıcı durumdaysa, hareket edemeyecek şekilde Bastırma durumuna geçirme şansı 50%'dir.",
  },
  'BeastQueen:2': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'İlk turda tüm takımlarımızın normal saldırı ve takip becerisi hasarı 80% arttı, etkisi 1/4 tur azaldı.',
  },
  'BeastQueen:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: "İlk 3 turda, rastgele 2 dost manganın Püskürtme durumuna girme şansı 70%'tir, normal saldırı hedefin arkasındaki 2 düşman mangaya 160% hasar verir.",
  },
  'BeastQueen:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "Savaşın ilk 3 turunda, ön sıradaki süvari takımının karşı saldırı durumuna girme şansı 70%'tir ve bu, temel saldırı sırasında kaynağa 250% geri dönüş hasarı verir.",
  },
  'Cao Cao:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "Geçerli aralıktaki 2 rastgele düşman ekibine 157% hasar verme şansı 80%'dir.",
  },
  'Cao Cao:5': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Cao Cao, Savaş Becerisini her kullandığında birliğinin hasarı 18% artar ve savaş bitene kadar 10 kata kadar birikir.',
  },
  'Cao Cao:7': {
    type: 'Aktif Beceri',
    target: 'Kahramanın Lejyonu',
    desc: 'Beceriyi kullandıktan sonra, Kahraman dizilişi 100% ilave yürüyüş hızına, 20 dakika boyunca 70% bonus Piyade Gücüne ve 15 saatlik Bekleme Süresine sahip olur. Aktif olmadığında, dövüş sırasında 50% etki kullanılır.',
  },
  'Cao Cao:8': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Rastgele 1 düşmana 396% hasar verme ve söz konusu mangalara Bocalama durumunu uygulama şansı 50% olup, hedeflerin her hasar aldığında hedeflerin 302% daha fazla hasar almasını sağlar. Etki, beceri her kullanıldığında 3 defaya kadar tetiklenebilir ve 1 tur sürer.',
  },
  'Charles the Great:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Geçerli aralık içindeki 2 rastgele düşman ekibine 255% hasar verme ve hedeflerin direncini 2 tur boyunca -170% yapma şansı: 40%.',
  },
  'Charles the Great:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'İlk 4 turda, tarafınızdaki 2 rastgele takımın verdiği hasarı 20% artırır; savaş bitene kadar 4 kata kadar istiflenebilir.',
  },
  'Charles the Great:8': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: "Geçerli aralık dahilindeki 1 rastgele düşman ekibine 510% hasar verme şansı 50%'dir ve sonraki 2 kez hasar aldığında arka sıradaki ekibinizin Kaçma durumuna girmesi için 100% şansa sahip olmasını sağlar.",
  },
  'Black Prince:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "2 tur süren, geçerli aralıktaki 2 rastgele düşman ekibine Bastırma, Susturma ve Silahsızlandırma'dan 1 statü uygulama şansı 35%.",
  },
  'Black Prince:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Maksimum Seviye: 60% olasılıkla geçerli menzildeki rastgele 2 düşman birliğinden 200% Direnç çalar; etki 2 tur sürer ve 2 defaya kadar birikir.',
  },
  'Black Prince:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '1 tur hazırlık. Geçerli aralıktaki 2 rastgele düşman ekibine 490% hasar verme ve hedeflerin Kudretini 2 tur boyunca -150% yapma şansı: 50%.',
  },
  'Lionheart:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "Geçerli aralıktaki 2 rastgele düşman ekibine 250% hasar verme ve Aslan Yürekli'nin beceri hasarını 1 tur boyunca 40% artırma şansı: 40%.",
  },
  'Lionheart:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '1 tur hazırlık. Geçerli aralık içindeki 2 rastgele düşman ekibine 288% hasar verme şansı 50% ve en düşük direnç içindeki düşman ekibine 288% daha fazla hasar verme şansı.',
  },
  'Lionheart:7': {
    type: 'Aktif Beceri',
    target: 'Kahramanın Lejyonu',
    desc: "Beceriyi kullandıktan sonra, Kahraman dizilişi 100% ilave yürüyüş hızına, 20 dakika boyunca 70% bonus Süvari Kudreti'ne ve 15 saatlik Bekleme Süresine sahip olur. Aktif olmadığında, dövüş sırasında 50% etki kullanılır.",
  },
  'Lionheart:8': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "1 tur hazırlık. Geçerli aralıktaki tüm düşman ekiplerine 343% oranında büyük hasar verme şansı 60%; Hazırlık yaparken, 1 tur boyunca Aslan Yürekli'ye İlk Saldırı durumunu uygular.",
  },
  'Al Fatih:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Al Fatih'in yaptığı normal saldırılarda verilen hasarı 1 tur boyunca 60% artırma şansı 80%.",
  },
  'Al Fatih:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Al Fatih, normal saldırılarda rastgele 1 düşman ekibini hedef alır ve Ölümcül Darbe yapma şansı 50%'dir.",
  },
  'Al Fatih:7': {
    type: 'Aktif Beceri',
    target: 'Kahramanın Lejyonu',
    desc: "Yeteneği kullandıktan sonra kahraman dizilişi 100% ilave yürüyüş hızı ve 20 dakika boyunca 70% ilave Okçu Kudreti kazanır; bekleme süresi 15 saattir. Etkin değilken savaşta etkinin 50%'si uygulanır.",
  },
  'Al Fatih:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Al Fatih'in kullandığı Ölümcül Darbe'nin hasar oranı, savaş bitene kadar 4 defaya kadar her tur 1 kez biriken etki dahilinde 60% artar.",
  },
  'Edward the Confessor:2': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'Tüm birliklerin ilk kez saldırıya uğradığında 100% olasılıkla Kaçınma kazanır. İlk 4 tur boyunca her tur 70% olasılıkla tüm düşman birliklerinin Beceri Hasarını -40% düşürür.',
  },
  'Edward the Confessor:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: '35% olasılıkla geçerli menzildeki rastgele 1 düşman birliğine 480% hasar verir ve hedefi 1 tur Bastırır.',
  },
  'Edward the Confessor:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: '3. turdan başlayarak, tarafınızdaki 2 rastgele ekibin Fiziksel Hasarı her turda 30% artırılabilir ve savaş bitene kadar 4 kata kadar istiflenebilir.',
  },
  'Constantine the Great:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: '1 tur hazırlık. Geçerli aralıktaki 2 rastgele düşman ekibine 330% hasar verme şansı 45%.',
  },
  'Constantine the Great:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Geçerli menzil içindeki 2 düşman ekibine 203% hasar verme ve arka sıradaki ekibinizin beceri hasarını 1 tur boyunca 50% artırma şansı 40%.',
  },
  'Constantine the Great:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Düşman',
    desc: "Tüm ekipleriniz hazırlık becerilerine hazırlanırken, Constantine'in geçerli aralıktaki 1 rastgele düşman ekibine 304% hasar verme şansı 80%'dir.",
  },
  'Genghis Khan:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "1 tur hazırlık. Kanama durumunu tüm düşman mangalarına uygulama şansı 50%'dir, bu da onların 2 tur boyunca her turda 213% hasar almalarını sağlar.",
  },
  'Genghis Khan:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "Geçerli aralıktaki 2 rastgele düşman ekibine 202% hasar verme şansı 50%'dir. Tüm düşman ekiplerine 202% daha fazla hasar verme şansı 50%'dir.",
  },
  'Genghis Khan:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'Savaş sırasında birliklerinizin kullandığı her 4 Savaş Becerisi için Cengiz Han, rastgele 2 dost birliğin asker gücünü yeniler (iyileşme oranı: 152%).',
  },
  'Jiguang Qi:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "Geçerli aralıktaki tüm düşman takımlarına 192% hasar verme şansı 40%'tır.",
  },
  'Jiguang Qi:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Geçerli menzil içindeki 2 düşman ekibine 220% hasar verme şansı 40%, bu da ekibin/birliklerin verdiği Fiziksel Hasarı 1 tur boyunca -40% azaltır.',
  },
  'Jiguang Qi:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: 'Mangalarınızdan herhangi birinin kullandığı her 2 savaş becerisi için Jiguang Qi Direnci 80% artar ve savaş bitene kadar 10 defaya kadar istiflenebilir.',
  },
  'Valkyrie:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: '2 tur boyunca kendi ekibinin normal saldırılar gerçekleştiremez hale gelme şansı 100%, hasar 30% artar ve menzil içindeki rastgele 1 düşman ekibine 218% hasar verir.',
  },
  'Valkyrie:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "1 tur hazırlık. Menzil içindeki 3 düşman ekibine 310% hasar verme şansı 45%'tir.",
  },
  'Valkyrie:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Kendi birliğinin Piyade ve Süvarilere karşı üstünlüğü 30% artar; her tur düşman birliğinin temel Direncinin 50%'sini yok sayma olasılığı 70%'tir.",
  },
  'Lawman:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Düşman',
    desc: "Kendi manganız hasar alırken, 2 menzil içindeki 2 rastgele mangaya 63% hasar verme şansı 50%'dir.",
  },
  'Lawman:5': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kendi birliğin ve rastgele 1 dost birlik her tur asker gücü yeniler (iyileşme oranı: 96.5%).',
  },
  'Lawman:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Müttefik',
    desc: '2 tur boyunca kendi takım için alınan hasarı -30% azaltma ve diğer 2 dost takım için düşmanlardan 30% hasar alma şansı 40%.',
  },
  'Spectral Reaper:2': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Düşman',
    desc: 'Normal saldırıdan sonra 35% olasılıkla aynı hedefe yeniden saldırarak 742% hasar verir ve hedefin asker gücünün 1 tur boyunca yenilenmesini engeller.',
  },
  'Spectral Reaper:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Geçerli aralık dahilindeki 1 rastgele düşman ekibine 455% hasar verme şansı 40%, kahramanın ekibinin normal saldırı girişimlerini 1 tur boyunca tur başına 1 artırma şansı 90%.',
  },
  'Spectral Reaper:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kahramanın birliği normal saldırılarda 100% daha fazla hasar verir. Her Savaş Becerisi kullanımından sonra 1 tur boyunca Ek Saldırı başlatma olasılığı +40% artar. Düşmanın kullandığı becerinin etkili menzili hesaplanırken kahramanın birliği düşmandan +1 mesafe uzakta sayılır.',
  },
  'Defender:2': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Müttefik',
    desc: "Temel saldırılardan sonra, kahramanın takımının aldığı hasarı 2 tur boyunca -20% yapma şansı 80%'dir. Durum istiflenebilir.",
  },
  'Defender:5': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Düşman',
    desc: 'Normal saldırıdan sonra 50% olasılıkla menzildeki rastgele 1 düşman birliğine 310% hasar verir ve kendi birliğinin asker gücünü yeniler (iyileşme oranı: 67%).',
  },
  'Defender:8': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Müttefik',
    desc: '2 tur boyunca 30% artırılmış hasarla, rastgele 2 dost ekibin iki kez saldırmasını sağlama şansı 35%.',
  },
  'Army Breaker:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Müttefik',
    desc: '55% olasılıkla menzildeki rastgele 2 dost birliğin asker gücünü yeniler (iyileşme oranı: 84%) ve zayıflatmalarını kaldırır (savaş öncesi zayıflatmalar kaldırılamaz).',
  },
  'Army Breaker:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Menzil içindeki rastgele 2 düşman ekibini susturma ve 2 tur boyunca -20% daha az hasar verme şansı: 40%.',
  },
  'Army Breaker:8': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Müttefik',
    desc: "Sonraki 3 hasarı alırken tüm dost takımların 60% kaçınma durumuna girme şansına sahip olma şansı 30%'dur ve 2 tur boyunca Kudret ve Direnci 47% arttırır.",
  },
  'The Avalanche:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "Birden fazla düşman hedefine 226% hasar verme şansı 60%'tır.",
  },
  'The Avalanche:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: '1 tur hazırlık, menzil içindeki 1 rastgele düşman ekibine 595% hasar verme şansı 40%, düşman arka sıra ekibine 310% hasar verme şansı 60%, onları bastırır ve 1 tur boyunca harekete geçemez hale getirir.',
  },
  'The Avalanche:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Savaşta kendi birliği Zihin Açıklığı kazanarak Susturma, Silahsızlandırma, Bastırma ve Şaşırtmaya bağışık olur; Kudreti 60% artar ve 30% ek hasar verir.',
  },
  'Dach Tengri:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Menzil içindeki rastgele 1 düşman ekibinin 6% ek hasar alması, verilen hasarın 6% azalması, savaş hızının -38 azalması ve 2 rastgele dost ekibin -6% daha az hasar alması, -6% ek hasar vermesi, 1 tur boyunca 38 artırılmış savaş hızı elde etmesi için 100% şans.',
  },
  'Dach Tengri:5': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: '4. turdan itibaren her tur 70% olasılıkla menzildeki rastgele 2 düşman birliğinin asker gücü yenilemesini engeller ve rastgele 2 dost birliğin aldığı hasarı -25% azaltır.',
  },
  'Dach Tengri:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'İlk 3 tur, her tur 2 rastgele dost mangaya 7% artırılmış hasar verir (Etki istiflenebilir), savaş bitene kadar, 4. turdan itibaren sıçrama durumu verilir, temel saldırılar arkadaki 2 düşman mangasına savaşın sonuna kadar 40% hasar verir.',
  },
  'Tarantula:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: 'Menzil içindeki 2 rastgele düşman ekibine 641% hasar verme şansı 30%, Kahramanın ekibinin ve arka sıra ekibinin verdiği hasar sonraki 2 saldırı için 40% artar. Kahramanın takımı arka sıra takımı ise, o zaman iki kat hasar güçlendirme etkisi kazanırlar. 2 tur sürer.',
  },
  'Tarantula:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: "Menzil içindeki 1 rastgele düşman ekibine 402% hasar verme şansı 35%'tir ve arka sıra ekibinin bir sonraki eyleminden önce, arka sıra ekibinden 4'ün menzili içindeki 1 rastgele düşman ekibine 403% hasar verir.",
  },
  'Tarantula:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Savaşlarda, kahramanın ekibi her turda rastgele bir güçlendirme kazanır: 1-Birlik gücünün bir kısmını geri yükleme (iyileşme oranı: 100%); 2-Kudret, Direnç, Taktiksel Kudret ve Direnç 60% artırıldı; 3-alma -40% hasar.',
  },
  'Alexander:2': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Düşman',
    desc: '1. ve 3. turda rastgele 1 düşman ekibine şok verin; bu, ekiplerin her hasar aldığında savaş bitene kadar sürecek şekilde 325% ek hasar almasını sağlar.',
  },
  'Alexander:5': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: 'Kahraman -60% daha az hasar alır ve 20% büyütülmüş iyileştirme etkisi kazanır, ancak alınan yanma hasarı da 300% artırılır.',
  },
  'Alexander:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "Tüm düşman mangalarının kanını akıtmak için 100% şans, her turda harekete geçmeden önce 260% hasar almalarını sağlar ve bu, savaş bitene kadar sürer. Kahramanın ekibi herhangi bir turda toplam birlik gücünün 25%'ini kaybederse, o turun sonunda ekibin birlik gücünün bir kısmı geri kazanılır (iyileşme oranı: 350%).",
  },
  'Lancelot:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "1 tur hazırlık. Tüm düşman mangalarına 356% hasar verme şansı 50%; Bir hedefin iyileştirme etkisi azalırsa veya birlik gücünü geri yükleyemezse, tüm düşman mangalarına ek olarak 356% hasar verir ve her düşman mangasının 1 tur boyunca Bastırılmış durumuna girme şansı 90%'dır.",
  },
  'Lancelot:5': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: 'Kahraman normal saldırılar gerçekleştiremez (etki kaldırılamaz). Her turda, 1 rastgele düşman mangasına 356% hasar verme şansı 100% olup, kahraman Cesaret/Adalet/Merhamet mühürlerinden birini kazanır (Cesaret: hasar 20% arttı; Adalet: Kaçış Oranı 10% arttı; Merhamet: mühür taşıyıcı her turda eylem yaparken birlik gücünün bir kısmını yenileyebilir, iyileşme oranı: 67%), savaş bitene kadar sürer ve 2 katmana kadar istiflenebilir; Üç mührün tümü kazanıldığında, beceri bunun yerine tüm düşman takımlarını hedef alacaktır.',
  },
  'Lancelot:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'Savaşın başlangıcında, tüm dost takımlara bir etki uygular: bir hazırlık becerisi kullandıklarında, 1 turu atlama şansı 80% (3 defaya kadar etkilidir). Efekt elde edildikten ve efekt denemeleri tükendikten sonra taşıyıcıya 1 mühür uygulanır.',
  },
  'Ragnar:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: "Geçerli menzil içindeki rastgele bir düşman ekibine 420% hasar verme şansı 50%'dir.",
  },
  'Ragnar:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: 'Tüm düşman takımlarına sırasıyla 1. turda 160% hasar, 3. turda 320% hasar, 5. turda 480% hasar ve 7. turda 640% hasar verir.',
  },
  'Ragnar:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: "Hasar verdikten sonra, kahramanın takımı ve arka sıradaki takımın, savaş bitene kadar süren ve 5 katmana kadar istiflenebilen Ölümcül Darbe ve Yıkıcı Saldırıyı başlatmak için 8% şans kazanma şansı 50%'dir. Son ekran görüntüsü satırının onaylanması gerekiyor.",
  },
  'Bjorn:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Menzil içindeki rastgele 1 düşman ekibine 2 kez saldırma şansı 40%, her seferinde 348% hasar verir. Her saldırı rastgele bir düşmanı hedef alır.',
  },
  'Bjorn:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: 'Tüm dost mangalar Susturulmuş, Silahsızlandırılmış, Bastırılmış ve Şaşkın düşman mangalarına +70% hasar verir. Düşman takımlarının, Kontrol Zayıflatıcısı süresini 1 tur uzatmak için 30% şansı vardır (Susturulmuş, Silahsızlandırılmış, Bastırılmış ve Şaşkın).',
  },
  'Bjorn:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: 'İlk 3 turda menzil içindeki 2 rastgele düşman ekibi -30% hasar verir. 4. turda bu takımların kafası karışır, saldırı ve 2 tur boyunca rastgele hedeflere saldırı becerileri uygulanır.',
  },
  'Skanda:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Müttefik',
    desc: 'Kendini ve ön sıradaki takımı iyileştirme şansı 50% (247% iyileşme oranı). Zaten ön sıradaysanız iyileştirmeyi ikiye katlayın.',
  },
  'Skanda:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Menzil içindeki en uzaktaki düşman ekibine 260% hasar verme ve onları 1 tur boyunca Bastırma şansı: 70%.',
  },
  'Skanda:8': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: '5. turda ön sıradaki dost birliğin zayıflatmalarını temizler. Hedef hasar aldığında 100% olasılıkla Sıyrılır ve bu hasara bağışık olur; etki 2 tur sürer.',
  },
  'Liberator:2': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Normal saldırılarla vurulduğunda 150% hasar için 50% karşı saldırı şansı. Ayrıca, kendi takımınızın 1 tur boyunca her tur -60% Beceri Hasarı alması için 50% şans.',
  },
  'Liberator:5': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Müttefik',
    desc: 'Normal saldırılar 80% olasılıkla 1 tur süren Birlik İyileştirme Engeli uygular. Ayrıca arka sıra birliğine 70% olasılıkla Zihin Açıklığı vererek onu 1 tur boyunca Susturma, Silahsızlandırma, Bastırma ve Şaşırtmaya bağışık hâle getirir.',
  },
  'Liberator:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Müttefik',
    desc: "Kahramanın takımı ön sırada olduğunda, tüm müttefik takımlar ilk 3 turda -20% daha az hasar alır. 4. turdan başlayarak, arka sıradaki takımınızın verdiği hasarın 40%'ı, etki sona erdikten sonra ön sıradaki birliklerin iyileşmesine dönüştürülür.",
  },
  'Ashen Verdict:2': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman',
    desc: "Ashen Verdict, takımlarınızın gerçekleştirdiği her normal saldırı için 1 Takip İşareti kazanır. İşaretler 7'ye ulaştığında, tüm düşman mangaları ilave 400% hasar alır ve mevcut işaretlerin tümü kaldırılır.",
  },
  'Ashen Verdict:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Müttefik',
    desc: 'Kahramanın ekibinin her turda 2 tur sürecek şekilde 1 ek normal saldırı yapma şansı 35%. Ekip bu süre boyunca Silahsızlanmaya karşı bağışıklıdır.',
  },
  'Ashen Verdict:8': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Kahramanın birliği her 2 normal saldırıdan sonra 35% olasılıkla rastgele bir düşman birliğine Silahsızlandırma, Susturma, Şaşırtma, Kesinti veya Birlik İyileştirme Engeli uygular. Her etkinin olasılığı bağımsız hesaplanır ve tüm etkiler 1 tur sürer.',
  },
  'Warden:2': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Müttefik',
    desc: 'İlk 4 turda, diğer iki kahramanınızın 5. becerisinin beceri kullanma şansı 10% artar (Savaş becerileri ve Pasif becerilerle sınırlıdır). 5. turda, beceri kullanma şansı 30% artar, ancak yalnızca diğer iki kahramandan birinin 5. becerisi için.',
  },
  'Warden:5': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman, Rastgele Müttefik',
    desc: 'Bir kontrol durumuna (Susturulmuş, Silahsızlandırılmış, Bastırılmış veya Şaşkın) tabi tutulduğunda ekibiniz -70% hasar alır. Etki, savaştaki bir manga üzerinde 3 defaya kadar tetiklenebilir. 1. ve 5. turda rastgele bir düşman ekibine 510% hasar verin.',
  },
  'Warden:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman',
    desc: 'Savaşlar sırasında, kahramanın ekibi için normal saldırılar devre dışı bırakılır, ancak arka sıradaki ekibiniz bir güçlendirme kazanır: tur başına +1 normal saldırı. Her normal saldırı, bir sonraki becerinin hasarını 12% artırır ve 5 tura kadar birikir.',
  },
  'Warhammer:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman, Rastgele Müttefik',
    desc: "Dost bir takımın hasar aldığı her defasında, +1 katman Yansıtıcı Zırh Yükü kazanırsınız. Zırh 9 katmana ulaştığında, rastgele bir dost takıma, başka bir katman ekleme şansı 30% olan bir Yansıtan Kalkan katmanı hediye edin. Kalkan, saldırganın kendisine gelecek bir sonraki hasarın 100%'ünü etkisiz hale getirebilir ve bu sefer kalkan sahibini herhangi bir hasardan koruyabilir. Bir kalkan verildikten sonra, Yansıtıcı Zırhın yığılmış tüm katmanları sıfırlanır.",
  },
  'Warhammer:5': {
    type: 'Savaş Becerisi',
    target: '3 Rastgele Düşman, Rastgele Müttefik',
    desc: '100% olasılıkla tüm düşman birliklerine 108% hasar verir; ancak tüm dost birlikler düşmanlara verilen hasarın 20% kadarını alır. Bu hasar Yansıtıcı Zırha yük kazandırır.',
  },
  'Warhammer:8': {
    type: 'Savaş Öncesi Beceri',
    target: '3 Rastgele Düşman, Rastgele Müttefik',
    desc: 'Hem düşman hem de dost birliklerin asker gücü yenilemesini -25% azaltır. 4. turdan itibaren tüm düşman birliklerin iyileşme etkisini her tur -15% daha azaltır. Bu etki birikir ve savaşın sonuna kadar sürer.',
  },
  'Eidolon:2': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "Kahramanın ekibinin temel Kaçınma Oranı 10%'dur ve her hasar aldıklarında 100%'e kadar biriken 25% bonus kazanır. Ekip bir saldırıdan başarıyla kurtulduğunda, bonus Kaçınma Oranı silinir.",
  },
  'Eidolon:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Müttefik',
    desc: "Tetikleme şansı 40%: Diğer 2 dost ekip, rastgele 1 düşman ekibinden 60% Kudret ve Direnç çeker. Ayrıca her temel saldırının 1 tur boyunca 250% bonus hasar verme şansı 100%'dür.",
  },
  'Eidolon:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: 'Kahramanın birliği başarılı bir Kaçınmadan sonra 33% olasılıkla asker gücünün 80% kadarını yeniler, 33% olasılıkla -35% daha az hasar alır ve 33% olasılıkla rastgele 2 düşman birliğinin 15% daha fazla hasar almasını sağlar. Her olasılık bağımsız hesaplanır, etkiler birikmez ve 2 tur sürer.',
  },
  'Scarlet Reaver:2': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Düşmanın ön sıradaki ekibine 100% hasar verme şansı 100%, en düşük birliklere sahip düşman ekibine 40% ilave 500% hasar verme şansı.',
  },
  'Scarlet Reaver:5': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: "1 tur hazırlık. 40% şansla 5 kez saldırır; her saldırı rastgele bir düşman ekibi seçip 150% hasar verir. Ayrıca her saldırının, düşman ekibine bağlı olarak 1 tur boyunca bir durum uygulama şansı 65%'tir: Okçular için Silahsızlandırma, Piyadeler ve Süvariler için Sessizlik. Silahsızlandırma ve Sessizlik en fazla 2 yığın biriktirebilir.",
  },
  'Scarlet Reaver:8': {
    type: 'Savaş Öncesi Beceri',
    target: '2 Rastgele Düşman',
    desc: '1., 4. ve 7. turlarda rastgele 2 düşman birliğine 2 tur Yanma uygular ve her tur 150% hasar verir. Kahramanın birliği Süvarilere karşı 35% Karşı Koyma kazanır; tüm dost birlikler Yanan hedeflere +50% Beceri Hasarı verir.',
  },
  'Rainforest Ranger:2': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Müttefik',
    desc: "Bu kahramanın ekibine verilen hasar, düşman ekibinin temel direncinin 25%'ini göz ardı eder. İlk 3 tur boyunca, bu kahramanın takımının normal saldırıları aynı konumdaki düşman takımına kilitlenir ve temel direncin iki katını göz ardı eder.",
  },
  'Rainforest Ranger:5': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Düşman',
    desc: "Normal bir saldırının ardından hedefe 350% ilave hasar verme şansı 50%'dir. Bonus hasarın tetiklenerek 1 rastgele düşmana 1 tur boyunca Bastırma uygulama şansı 50%'dir.",
  },
  'Rainforest Ranger:8': {
    type: 'Ek Saldırı',
    target: '1 Rastgele Müttefik',
    desc: "Normal bir saldırının ardından hedefe 600% Ek Hasar verme şansı 35%'tir. Hedef takımın Birlik Gücü savaşın başlangıcındakinden 50% daha düşükse bu ek hasar 810%'a çıkarılır.",
  },
  'Fortuneteller:2': {
    type: 'Savaş Öncesi Beceri',
    target: '1 Rastgele Düşman',
    desc: 'Rastgele 1 düşman birliğini işaretler, iyileşmesini -70% azaltır ve birlik türüne göre bir zayıflatma uygular. Piyade: Tüm düşman birlikler +20% daha az normal saldırı hasarı alır. Okçu: Tüm düşman birlikler -40% daha az normal saldırı hasarı verir. Süvari: Tüm düşman birlikler -30% daha az Beceri Hasarı verir.',
  },
  'Fortuneteller:5': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "2 tur boyunca 1 rastgele düşman takımını işaretli takıma bağlama şansı 50%. Takımlardan herhangi biri hasar aldığında diğer takım bu hasarın 50%'sini alır.",
  },
  'Fortuneteller:8': {
    type: 'Savaş Becerisi',
    target: '1 Rastgele Düşman',
    desc: 'Herhangi bir dost ekibin bir savaş becerisi kullandığı her defasında +1 Yük kazanırsınız. 6 Yük toplandığında, işaretli ekibe 750% hasar verir ve onları 1 tur boyunca Bastırır.',
  },
  'Cyrus:2': {
    type: 'Savaş Becerisi',
    target: '2 Rastgele Düşman',
    desc: "1 tur hazırlık. 2 rastgele düşman ekibine 325% hasar vererek onların 1 tur boyunca birlik gücünü yenilemelerini engelleme şansı: 65%. Bu becerinin hazırlık aşamasını atlayıp doğrudan kullanılma şansı 80%'dir.",
  },
  'Cyrus:5': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Tüm dost Süvari takımları Fırtına Süvarisi etkisini kazanır: aktif bir beceri kullanıldığında 40% daha fazla hasar verir; Takip becerisi kullanıldığında alınan hasar 40% azalır ve 2 tur sürer. Mangalarınızdan herhangi biri Fırtına Süvarisi etkisini tetiklediğinde Cyrus, savaşın sonuna kadar sürecek olan etkisinin 50%'sini kazanır; bu etki 5 katmana kadar istiflenebilir.",
  },
  'Cyrus:8': {
    type: 'Durum Becerisi',
    target: '1 Rastgele Müttefik',
    desc: "Cyrus'un birliği 10% olasılıkla Kaçınır. Her başarılı Kaçınmadan sonra Cyrus, İlk Saldıran ve Soğukkanlı dâhil çeşitli etkilerden birini rastgele kazanır. Kaçınma başarısız olursa tüm birlikleriniz anında 1 tur Soğukkanlı olur ve sonraki saldırıdan aldığı hasarı 50% azaltır; bu etki tur başına bir kez uygulanır.",
  },
};

const strings = {
  '1 random friendly squad within effective range': 'Etkin menzil içinde 1 rastgele dost ekip',
  '3 random friendly squads within effective range': 'Etkin menzil içinde rastgele 3 dost ekip',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    'Kullanılabilir bir savaş becerisi. Bazılarının hazırlık süresi, tetikleme şansı, menzili ve kuralları vardır.',
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    'Olumsuz etkilerin ortadan kaldırılmasına veya önlenmesine yardımcı olan bir temizleme veya kontrol-direnç durumu.',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    'Genellikle kahraman lejyonda olduğu sürece geçerli olan, komutan tarzı bir pasif etki.',
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    'Bir kontrol bağışıklığı veya temizleme durumu; genellikle süresi boyunca devre dışı bırakıcı etkilerden korur.',
  'A damage-over-time status that keeps hurting the affected squad while active.':
    'Etkin durumdayken etkilenen takıma zarar vermeye devam eden, zamanla hasar durumu.',
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    'Etkin durumdayken etkilenen takıma zarar vermeye devam eden, zamanla hasar tarzı bir durum.',
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    'Susturma, Devre Dışı Bırakma, Bastırma veya Karıştırma gibi devre dışı bırakma durumu.',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    'Ana hedefin ötesindeki ek düşman birliklerini vuran normal bir saldırı durumu.',
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    'Durumları, dokunulmazlıkları, hasar kurallarını veya devam eden savaş davranışını değiştiren pasif/durum odaklı bir beceri.',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    'Koşulları ve şans atışları karşılandığında savaş sırasında tetiklenebilecek bir beceri.',
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    'Yeteneğe bağlı olarak savunmaları atlayabilen veya cezalandırabilen özel bir hasar etkisi.',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    'Kendi şansı ve hasar oranı olan, genellikle güçlendirmelerle artan özel bir vuruş etkisi.',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    'Bazı kahramanlar tarafından takip etkilerini, hasarı veya tetikleme şansını artırmak için kullanılan istiflenebilir bir güçlendirme.',
  'A status that makes the target vulnerable to fire-related effects.':
    'Hedefi yangınla ilgili etkilere karşı savunmasız hale getiren bir durum.',
  'A weakening status that reduces effectiveness while active.':
    'Aktifken etkinliği azaltan bir zayıflama durumu.',
  'Active Skill': 'Aktif Beceri',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    'Bazı kahramanlar için ekstra beceri efektlerinin kilidini açabilen, düşman takımlarından önce hareket eder.',
  'Additional Attack': 'Ek Saldırı',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    'Normal saldırıları ekler veya değiştirir; genellikle saldırılardan sonra ekstra vuruşlar veya etkiler yaratır.',
  'Affected squad may attack or cast skills on random targets.':
    'Etkilenen birlik rastgele hedeflere saldırabilir veya becerilerini kullanabilir.',
  'Affected squad takes more damage or loses protection while active.':
    'Etkilenen ekip aktifken daha fazla hasar alır veya korumayı kaybeder.',
  'All Biography Attributes activated': 'Tüm Biyografi Nitelikleri etkinleştirildi',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    'Savaş başlangıcından önce veya savaş başlangıcında uygulanır; genellikle güçlendirmeleri, zayıflatmaları, açılış koşullarını veya turun başındaki kuralları belirler.',
  'Armor break': 'Zırh kırılması',
  'Army Defense': 'Ordu Savunması',
  'Army HP': "Ordu HP'si",
  'Army Might': 'Ordu Gücü',
  'Arthur Pendragon the Once and Future King':
    'Arthur Pendragon, Bir Zamanların ve Geleceğin Kralı',
  'Avoids an incoming damage instance or attack while active.':
    'Aktifken gelen bir hasar örneğini veya saldırıyı önler.',
  Biography: 'Biyografi',
  'Biography attributes': 'Biyografi nitelikleri',
  'Biography Attributes': 'Biyografi Nitelikleri',
  'Biography skin details pending': 'Biyografi görünüm ayrıntıları bekleniyor',
  'Biography: Hidden Power': 'Biyografi: Gizli Güç',
  Bleeding: 'Kanama',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    'Kaydedilen ekran görüntüsünde Ebediyet Lv.10 seviyesinde ve en yüksek düzeye ulaşmış görünüyor.',
  Chain: 'Zincir',
  Clarity: 'Zihin Açıklığı',
  'Combat Skill': 'Savaş Becerisi',
  'Combat Skill Damage': 'Savaş Becerisi Hasarı',
  Confuse: 'Şaşırtma',
  Confused: 'Şaşkın',
  'Control Debuff': 'Kontrol Zayıflatıcısı',
  'Counter-attack': 'Karşı saldırı',
  Counterattack: 'Karşı saldırı',
  Cursed: 'Lanetli',
  'Damage dealt by a skill rather than a normal attack.':
    'Normal bir saldırı yerine bir beceriyle verilen hasar.',
  'Damage dealt specifically by combat skills, not normal attacks.':
    'Hasar, normal saldırılarla değil, özellikle savaş becerileriyle verilir.',
  'Damage or effects can jump from one squad to another.':
    'Hasar veya etkiler bir takımdan diğerine atlayabilir.',
  'Damage spills onto nearby or additional squads.': 'Hasar yakındaki veya ek ekiplere yayılır.',
  'Damage taken': 'Alınan hasar',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    'Savaşın başlangıcında kahramanın aldığı hasar 80% azalır. Kahramanın her hasar aldığında, azaltma 8% azalır (ilk 3 turda her seferinde 4% azalır), Direnç 20% artar ve verilen Hasar 10% artar, savaş bitene kadar 20 katmana kadar istiflenebilir.',
  'Damage type usually tied to normal or physical strikes.':
    'Hasar türü genellikle normal veya fiziksel saldırılara bağlıdır.',
  'Deals damage back after being attacked or after a matching trigger.':
    'Saldırıya uğradıktan sonra veya eşleşen bir tetikleyiciden sonra hasarı geri verir.',
  Defend: 'Savunma',
  'Destructive Strike': 'Yıkıcı Saldırı',
  'Details pending': 'Ayrıntılar bekleniyor',
  Disarm: 'Silahsızlandırma',
  Disarmed: 'Silahsız',
  Dodge: 'Kaçınma',
  Dodging: 'Kaçınma',
  'Dynamic icon behavior pending capture.': 'Dinamik simge davranışı için veri kaydı bekleniyor.',
  'Dynamic icon capture pending.': 'Dinamik simge için veri kaydı bekleniyor.',
  Eternity: 'Ebediyet',
  Everlasting: 'Ebedî',
  Faltering: 'Sendeleme',
  'Fatal Blow': 'Ölümcül Darbe',
  Feverish: 'Hararetli',
  'First to Attack': 'İlk Saldıran',
  'First-Aid': 'İlk Yardım',
  Flammable: 'Yanıcı',
  Footmen: 'Piyadeler',
  'Forces or redirects enemy attacks toward the taunting squad.':
    'Düşman saldırılarını Kışkırtma uygulayan birliğe yönlendirir.',
  Healing: 'İyileştirme',
  'Healing or recovery effect that restores troop power.':
    'Asker gücünü geri kazandıran iyileştirme etkisi.',
  Inheriting: 'Miras',
  'Inheriting Skill': 'Miras Becerisi',
  'Inheriting skill details pending.': 'Miras Becerisi ayrıntıları bekleniyor.',
  'Inheriting skill details will be added after capture.':
    'Veri kaydı tamamlandıktan sonra Miras Becerisi ayrıntıları eklenecek.',
  Interrupting: 'Kesinti',
  'Leadership Skill': 'Liderlik Becerisi',
  Legendary: 'Efsanevi',
  'Mass Attack': 'Toplu Saldırı',
  Melee: 'Yakın Dövüş',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    'Daha fazla kilidi açılmış Biyografi Görünümü çeşidi, bir kahramanın ek çeşitleri olduğunda daha güçlü Gizli Güç ekleyebilir.',
  Mythic: 'Mitik',
  'Normal Attack': 'Normal Saldırı',
  'Own 2 Biography Skin variants': '2 Biyografi Görünümü çeşidine sahip olun',
  'Owned skin bonus': 'Sahip olunan görünüm bonusu',
  pending: 'beklemede',
  'Physical Damage': 'Fiziksel Hasar',
  Poisoned: 'Zehirlendi',
  'Pre-Battle Skill': 'Savaş Öncesi Beceri',
  'Pre-Battle Skills': 'Savaş Öncesi Beceriler',
  'Prep Skills': 'Hazırlık Becerileri',
  Preserving: 'Koruma',
  'Preserving Skill': 'Koruma Becerisi',
  'Preserving skill and dynamic icon details pending.':
    'Koruma Becerisi ve dinamik simge ayrıntıları bekleniyor.',
  'Preserving skill details will be added after capture.':
    'Veri kaydı tamamlandıktan sonra Koruma Becerisi ayrıntıları eklenecek.',
  'Preserving unlock items': 'Koruma Becerisini açan eşyalar',
  'Prevents affected squads from recovering troop power while active.':
    'Etkilenen mangaların aktifken birlik gücünü geri kazanmasını engeller.',
  'Prevents combat skill casting while active.':
    'Aktifken savaş becerilerinin kullanılmasını önler.',
  'Prevents normal attacks while active.': 'Aktifken normal saldırıları önler.',
  'Prevents the squad from acting or casting depending on the skill wording.':
    'Beceri açıklamasına göre birliğin hareket etmesini veya beceri kullanmasını engeller.',
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    'Etkilenen takımı, genellikle beceri kullanımı olmak üzere belirli eylemleri gerçekleştirdiğinde cezalandırır.',
  Recovery: 'İyileşme',
  'Reduces defensive value, making affected squads take more damage.':
    'Savunma değerini azaltarak etkilenen ekiplerin daha fazla hasar almasını sağlar.',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    "Görünüm Yıldız 2'ye ulaştığında Kader Çarkı, Ebediyet ile değiştirilir.",
  Resistance: 'Direnç',
  'Restores troop power to one or more squads.':
    'Bir veya daha fazla birliğin asker gücünü yeniler.',
  'Restores troop power; usually shown as a recovery rate.':
    'Birlik gücünü geri kazandırır; genellikle iyileşme oranı olarak gösterilir.',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    'Beceriye bağlı olarak yenilmiş veya ağır hasarlı birliği yeniden savaşa döndürür ya da asker gücünü yeniler.',
  Revived: 'Diriltilmiş',
  'Royal Exclusive': 'Kraliyete Özel',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  Silence: 'Sessizlik',
  Silenced: 'Susturuldu',
  'Skill activated': 'Beceri etkinleştirildi',
  'Skill Damage': 'Beceri Hasarı',
  'Skills that need one or more rounds of preparation before firing.':
    'Ateş etmeden önce bir veya daha fazla hazırlık turu gerektiren beceriler.',
  'Skin advancement complete': 'Görünüm geliştirmesi tamamlandı',
  'Skin advancement unlocks the upgraded hero skill.':
    'Görünüm geliştirmesi, yükseltilmiş kahraman becerisinin kilidini açar.',
  'Skin ownership grants biography attributes once details are captured.':
    'Veri kaydı tamamlandığında görünüme sahip olmak Biyografi Niteliklerini etkinleştirir.',
  'Skin ownership grants the biography attributes by default.':
    'Görünüm sahipliği, varsayılan olarak biyografi niteliklerini verir.',
  Sober: 'Soğukkanlı',
  'Solid Shield': 'Sağlam Kalkan',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    'Bazı kahramanların birden fazla Biyografi Görünümü çeşidi vardır. Bu varyantlar aynı Biyografi Niteliklerini ve ilerlemeyi paylaşır; birden fazla varyanta sahip olmak Gizli Gücün kilidini açar.',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    'Özel kilit açma eşyaları, Koruma Becerisi ile hareketli simgeyi açar.',
  Splash: 'Sıçrama',
  'Star 1': 'Yıldız 1',
  'Star 2': 'Yıldız 2',
  'Star 3': 'Yıldız 3',
  'Star 3 uses the same unique icon with a small in-place movement.':
    "Yıldız 3'te aynı benzersiz simge bulunduğu yerde hafifçe hareket eder.",
  'Status Skill': 'Durum Becerisi',
  'Stops a channeling or prep skill before it completes.':
    'Bir yönlendirme veya hazırlık becerisini tamamlanmadan önce durdurur.',
  Suppress: 'Bastır',
  Suppressed: 'Bastırılmış',
  'Tactical Might': 'Taktiksel Güç',
  'Tactical Resistance': 'Taktik Direnç',
  Taunt: 'Kışkırtma',
  Taunting: 'Kışkırtma',
  'The basic attack a squad performs without casting a combat skill.':
    'Bir takımın savaş becerisi kullanmadan gerçekleştirdiği temel saldırı.',
  "The Hero's squad": 'Kahramanın kadrosu',
  "The hero's squad gains 4% HP and takes 2% less damage.":
    'Kahramanın ekibi 4% HP kazanır ve 2% daha az hasar alır.',
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    'Kahramanın ekibi -10% Beceri Hasarı alır; Kahramanın Lejyonu 13% Direnç kazanır.',
  'The Once and Future King': 'Bir Zamanların ve Geleceğin Kralı',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    'Koruma Becerisinin kilidi açıldıktan sonra aynı benzersiz simge bulunduğu yerde hafifçe hareket eder.',
  'Troop Damage': 'Birlik Hasarı',
  'Troop Recovery Block': 'Birlik İyileştirme Engeli',
  'Unique icon becomes available with the inheriting skill.':
    'Miras Becerisi açıldığında benzersiz simge kullanılabilir hâle gelir.',
  'Unique skin icon available when the inheriting skill is unlocked.':
    'Miras Becerisinin kilidi açıldığında benzersiz görünüm simgesi kullanılabilir.',
  Vulnerable: 'Savunmasız',
  'Wheel of Fortune': 'Kader Çarkı',
  Basic: 'Temel',
  Intermediate: 'Orta',
  Advanced: 'İleri',
  'The entry-level skin tier — it grants an Inheriting Skill but never a Preserving Skill.':
    'Giriş seviyesi kostüm kademesi — Miras Becerisi kazandırır ancak Koruma Becerisi kazandırmaz.',
  'The mid tier — it carries both an Inheriting Skill and a Preserving Skill, funded with standard Biography Seals.':
    'Orta kademe — hem Miras hem de Koruma Becerisi sunar ve standart Biyografi Mühürleriyle geliştirilir.',
  'The top tier — it also has an Inheriting Skill and a Preserving Skill, but its upgrades cost the pricier Advanced Biography Seals.':
    'En üst kademe — iki beceriyi de sunar ancak geliştirmeleri daha pahalı İleri Biyografi Mühürleri gerektirir.',
  'Granted on activation (owning the skin).':
    'Kostüm etkinleştirildiğinde (sahip olduğunda) verilir.',
  "Buy directly during that hero's launch event — yours to keep once purchased.":
    'İlgili kahramanın çıkış etkinliğinde doğrudan satın al — satın aldıktan sonra kalıcı olarak senin olur.',
  "Trade for it in the Eden Skin Store: Beast Queen's Mythic skin runs 400 Biography Skin coins.":
    'Eden Skin Store’da takas et: Beast Queen’in Mythic kostümü 400 Biography Skin jetonuna alınır.',
  'Pull from launch or return event packs (about a 1.4% drop rate per pack).':
    'Çıkış veya geri dönüş etkinliği paketlerinden elde et (paket başına yaklaşık 1,4% düşme oranı).',
  'Pick select skins up from the Eden Skin Store rotation.':
    'Belirli kostümleri Eden Skin Store rotasyonundan al.',
  'Recruit certain skins with Super Vouchers.': 'Belirli kostümleri Super Vouchers ile al.',
  'Earn some as milestone rewards in cumulative gem-spend events.':
    'Bazılarını toplam mücevher harcama etkinliklerinde aşama ödülü olarak kazan.',
  'Exchange Perfect Crystals for them in the Premium Shop.':
    'Premium Shop’ta Perfect Crystals karşılığında takas et.',
  'Only two heroes have Mythic skins.': 'Yalnızca iki kahramanın Mythic kostümü vardır.',
  'The most common skin tier — most heroes with a skin fall here.':
    'En yaygın kostüm kademesi — kostümü olan kahramanların çoğu bu kademededir.',
  'Epic Hero Medal': 'Epik Kahraman Madalyası',
  'Legendary Hero Medal': 'Efsanevi Kahraman Madalyası',
  'Seasonal Legendary Hero Medal': 'Sezonluk Efsanevi Kahraman Madalyası',
  'Biography Seal': 'Biyografi Mührü',
  'Advanced Biography Seal': 'İleri Biyografi Mührü',
};

export default { skills, strings };
