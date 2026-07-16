const skills = {
  'Immortal:2': {
    type: 'Serangan Tambahan',
    target: '1 Musuh Acak',
    desc: 'Setelah serangan normal, ada peluang 40% untuk menyerang 1 skuad musuh acak dalam jangkauan valid sebanyak 2 kali, masing-masing menimbulkan damage 348%.',
  },
  'Immortal:5': {
    type: 'Serangan Tambahan',
    target: '1 Musuh Acak',
    desc: 'Setelah serangan normal, ada peluang 34% untuk menimbulkan damage 465% kepada 1 skuad musuh acak dalam jangkauan dan memberinya status Bungkam sehingga tidak dapat menggunakan skill tempur selama 1 ronde.',
  },
  'Immortal:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Meningkatkan damage 80% untuk legiun tempat hero berada.',
  },
  'Wind-Walker:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Setiap kali skuad menerima serangan dasar, skuad memasuki status Pertolongan Pertama dan memulihkan pasukan setiap ronde (tingkat pemulihan: 20%). Efek berlangsung selama 2 ronde dan dapat ditumpuk hingga 8 kali.',
  },
  'Wind-Walker:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 60% untuk menimbulkan damage 331% pada 2 skuad musuh dalam jangkauan, dan menimbulkan damage 331% pada skuad sendiri.',
  },
  'Wind-Walker:8': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 50% untuk memprovokasi 2 skuad musuh acak dalam jangkauan selama 2 ronde. Skuad sendiri memasuki status Serangan Balik: saat menerima serangan dasar, skuad membalas damage sebesar 150% dan Resistansi meningkat 100% selama 2 ronde.',
  },
  'Hunk:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Ketika skuad menerima damage, peluang 25% untuk menghindar (kebal terhadap damage ini), peluang 50% setiap ronde untuk meningkatkan damage skuad sebesar 50%.',
  },
  'Hunk:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 30% untuk memberi 2 skuad musuh acak status Bingung (skill dan serangan dasar memilih target acak) serta Mudah Terbakar (menerima damage pembakaran tambahan 50%) selama 2 ronde.',
  },
  'Hunk:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama 6 ronde pertama, semua skuad sekutu mendapat peningkatan Kecepatan Tempur sebesar 37. Sebanyak 50% damage yang diterima ditangguhkan dan dihitung pada ronde 7; pada ronde pra-pertempuran, tim menimbulkan damage 469% kepada 2 musuh acak.',
  },
  'Sakura:2': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama 2 ronde pertama, 2 musuh acak bergerak lebih dulu. Pada ronde kedua, skill menimbulkan damage 687% kepada 2 skuad musuh acak dalam 2 serangan.',
  },
  'Sakura:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: '3 ronde pertama, 2 skuad musuh acak menerima 50% damage tambahan.',
  },
  'Sakura:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama 3 ronde pertama, 2 skuad Pemanah sekutu acak menimbulkan damage tambahan 50%.',
  },
  'ELK:2': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Putaran 3 pertama, skuad Pemanah baris depan memiliki peluang 70% untuk memasuki kondisi serangan balik, yang memberikan 250% damage kembali ke sumbernya ketika serangan dasar.',
  },
  'ELK:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Pada ronde 1/3/5, ada peluang 100% untuk menimbulkan damage 220% kepada 3 skuad musuh acak dalam jangkauan valid dan memberi target status Rentan. Setiap kali terkena, target menerima damage 15% lebih besar daripada ronde sebelumnya; efek berlangsung selama 1 ronde.',
  },
  'ELK:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama tiga ronde pertama, 2 skuad sekutu acak memiliki peluang 70% untuk mendapat status Sadar (kebal terhadap Bungkam, Dilucuti, Ditekan, dan Bingung) serta peningkatan Might 55%.',
  },
  'Mary Tudor:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Peluang 60% untuk memberikan damage 325% pada 1 skuad musuh acak dalam jangkauan yang valid; jika kekuatan skuad target lebih rendah dari 50%, 195% lebih banyak damage yang akan diberikan.',
  },
  'Mary Tudor:5': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Setiap kali Mary I mengeluarkan skill tempur, pasukannya menimbulkan damage skill +25%, (dapat ditumpuk hingga 6 kali) yang bertahan hingga pertempuran berakhir.',
  },
  'Mary Tudor:8': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Peluang 50% untuk memberikan damage 368% ke 2 skuad musuh acak dalam rentang yang valid dan membuat mereka berstatus pendarahan, membuat mereka menerima damage 155% sebelum mengambil tindakan di awal setiap ronde, yang berlangsung selama 2 ronde.',
  },
  'Cicero:2': {
    type: 'Serangan Tambahan',
    target: '2 Musuh Acak',
    desc: 'Setelah serangan dasar, ada peluang 30% untuk menimbulkan damage 310% kepada 2 skuad musuh acak dalam jangkauan dan membuat mereka menerima damage tambahan 20% selama 2 ronde.',
  },
  'Cicero:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 60% untuk memberi 2 skuad musuh acak status Penghancuran Armor, menurunkan Pertahanan sebesar -200% selama 2 ronde.',
  },
  'Cicero:8': {
    type: 'Skill Tempur',
    target: '1 Sekutu Acak',
    desc: 'Ada peluang 50% untuk membuat skuad barisan depan mendapat peluang Penghindaran 100% terhadap 3 damage berikutnya selama 2 ronde.',
  },
  'Beowulf:2': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Setelah setiap serangan normal, damage yang disebabkan oleh serangan normal hero akan diperbesar sebesar 20%, dapat ditumpuk hingga 5 lapisan; setelah mencapai batas tumpukan, hero memasuki status Serangan Massal, memberikan sejumlah damage setara dengan 260% + jumlah lapisan efek "Demam" *50% ke dua skuad musuh selain target dalam serangan normal; efeknya dapat menimbulkan Damage Kritis; Sementara itu, 100% berpeluang mengabaikan status Penghindaran musuh saat memberikan damage.',
  },
  'Beowulf:5': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Musuh Acak',
    desc: 'Untuk setiap 2 serangan normal yang dilancarkan, memulihkan sejumlah kekuatan skuad untuk hero dan 1 skuad sekutu acak (tingkat pemulihan: 75%), dan memberikan 350% damage Fisik ke 1 skuad musuh acak (dapat memicu Pukulan Fatal), membuat skuad musuh target berstatus Dilucuti selama 1 putaran.',
  },
  'Beowulf:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Mendapatkan peluang 20% untuk Pukulan Fatal. Setelah setiap efek penyembuhan diterima, memperoleh efek Membara dan peluang tambahan 10% Pukulan Fatal (efek Membara dapat ditumpuk hingga 8 kali), yang bertahan hingga pertempuran berakhir; sementara itu, 90% berpeluang bagi hero untuk menghapus semua status negatif pada hero dan memasuki status Sadar, kebal terhadap efek kontrol dan bertahan hingga langkah berikutnya.',
  },
  'Theodora:2': {
    type: 'Skill Tempur',
    target: '1 Sekutu Acak',
    desc: 'Ada peluang 60% untuk menimbulkan Damage Skill 20% kepada 1 skuad sekutu acak selain skuad hero, lalu meningkatkan damage yang ditimbulkan target sebesar 50% selama 2 ronde.',
  },
  'Theodora:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak',
    desc: 'Saat hero menerima damage, ada peluang 40% untuk menimbulkan Damage Skill 160% kepada semua skuad musuh. Setiap target memiliki peluang 40% untuk menerima 1 status acak (Ditekan, Dibungkam, Dilucuti, atau Bingung) selama 2 ronde.',
  },
  'Theodora:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Saat skuad depan-bawah memberikan damage, pulihkan kekuatan skuad untuk skuad menjadi 60% dari damage yang ditimbulkan, yang berlangsung selama 6 putaran; efeknya dapat berlaku hingga 2 kali dalam satu putaran. Ketika skuad barisan depan mati, hero akan bertarung selama 1 ronde lebih banyak (efeknya tidak berlaku untuk pertempuran melawan Penjaga Wilayah).',
  },
  'Caesar:2': {
    type: 'Skill Tempur',
    target: '3 Sekutu Acak',
    desc: 'Mulai ronde 3, Caesar memiliki peluang 40% untuk menggunakan skill pada setiap ronde, meningkatkan Might dan Resistansi seluruh skuad Kavaleri Anda sebesar 200% serta damage sebesar 60%. Caesar juga mendapat tambahan peluang 20% untuk melancarkan serangan tambahan hingga pertempuran berakhir; skill ini hanya dapat digunakan satu kali. Peluang penggunaan skill meningkat 20% pada setiap ronde.',
  },
  'Caesar:5': {
    type: 'Serangan Tambahan',
    target: '2 Musuh Acak',
    desc: 'Setelah serangan normal, ada peluang 60% untuk menimbulkan Damage Fisik (tingkat damage: 480%) kepada 2 skuad musuh acak. Sebanyak 50% damage digunakan untuk memulihkan kekuatan pasukan 2 skuad acak di pihak Anda. Skill memiliki waktu tunggu 1 ronde setelah digunakan. Saat pertama kali menghindari damage pada setiap ronde, ada peluang 100% untuk langsung menggunakan skill tanpa memicu waktu tunggu.',
  },
  'Caesar:8': {
    type: 'Serangan Tambahan',
    target: '3 Musuh Acak',
    desc: 'Setelah serangan normal, ada peluang 50% untuk menimbulkan Damage Fisik kepada 2-3 skuad (tingkat damage: 310%). Tingkat damage Penguasa Pendikte meningkat 1 tingkat setiap kali skill digunakan; efek dapat ditumpuk hingga pertempuran berakhir, tetapi skill hanya dapat dipicu satu kali per ronde.',
  },
  'Octavius:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Octavius memiliki peluang 80% untuk mendapat efek Provokasi setiap ronde. Saat skill aktif atau serangan tambahan musuh mengejar skuad acak, Octavius diprioritaskan sebagai target. Peluang penggunaan skill ini berkurang 5% setiap ronde.',
  },
  'Octavius:5': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Octavius menerima damage -25%. Di awal pertempuran, skuad barisan tengah dan belakang mendapat status Penghindaran sehingga kebal terhadap 3 damage berikutnya selama 2 ronde. Setiap kali menerima damage, ada peluang 100% untuk meningkatkan Might 1 skuad Kavaleri sekutu acak sebesar 30% (maks. 300%). Efek dapat ditumpuk hingga 10 lapisan untuk setiap skuad.',
  },
  'Octavius:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Saat HP pertama kali turun di bawah 85%, semua skuad Anda menerima Damage Skill -50% selama 3 ronde. Saat HP pertama kali turun di bawah 50%, semua skuad musuh langsung menerima Damage Fisik (tingkat damage: 350%). Saat HP pertama kali turun di bawah 25%, semua skuad musuh kembali menerima Damage Fisik (tingkat damage: 350%). Setiap pemicu skill meningkatkan Resistansi Octavius sebesar 150%.',
  },
  'Boudica:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Boudica menyerang ke depan. Peluang 70% untuk menimbulkan 200% damage pada 1 skuad musuh di baris tengah atau belakang dalam rentang yang valid selama 3 kali berturut-turut; 40% dari damage akan digunakan untuk memulihkan kekuatan 2 skuad acak di pihak Anda.',
  },
  'Boudica:5': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Boudica memiliki perlindungan alami permanen. Saat menimbulkan Damage Skill, ada peluang 30% untuk memicu Serangan Penghancur pada target. Jika Boudica bertindak sebelum semua skuad musuh, peluang penggunaan skill dan Serangan Penghancurnya meningkat 20%, tetapi ia tidak lagi melakukan serangan normal.',
  },
  'Boudica:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Musuh Acak',
    desc: 'Sebelum pertempuran, beri 2 skuad musuh acak dalam jangkauan valid sebanyak 5 Tanda Tombak. Setiap lapisan meningkatkan Damage Skill yang diterima target sebesar 10% dan mengabaikan efek penundaan damage pada target. Tanda berkurang 1 lapisan setiap ronde. Selama pertempuran, ada peluang 60% pada setiap ronde untuk menimbulkan Damage Besar 500% kepada skuad musuh dengan kekuatan pasukan terendah.',
  },
  "Jeanne d'Arc:2": {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 50% untuk menimbulkan damage 477% kepada 2 skuad musuh acak dalam jangkauan valid dan membuat mereka menerima Damage Skill 30% lebih besar.',
  },
  "Jeanne d'Arc:5": {
    type: 'Skill Tempur',
    target: '2 Sekutu Acak',
    desc: '1 ronde persiapan. Ada peluang 65% untuk memberi 2 skuad sekutu acak status Dihidupkan Kembali. Saat menerima damage, mereka memiliki peluang 50% untuk memulihkan kekuatan pasukan (tingkat pemulihan: 101%) selama 2 ronde.',
  },
  "Jeanne d'Arc:8": {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Dalam pertempuran, skuad Kavaleri Anda akan memiliki peluang 60% untuk melewati 1 putaran persiapan saat menggunakan skill persiapan (dapat dipicu hingga 1 kali oleh masing-masing skuad di setiap putaran); Sementara itu, peluang 80% untuk meningkatkan damage skill yang diberikan oleh skuad hero sebesar 86%, berlangsung selama 1 putaran. Hasil dari setiap efek akan ditentukan secara independen.',
  },
  'Alfred:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 35% untuk memberikan damage 335% kepada 2 skuad musuh dalam jangkauan yang valid dan membuat efek pemulihan kekuatan skuad target menjadi -40%. Jika target sudah terkena status yang menghentikannya memulihkan kekuatan skuad atau mengekang pemulihan kekuatannya, target akan menerima 30% lebih banyak damage skill untuk 2 ronde.',
  },
  'Alfred:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Peluang 30% untuk memberikan 492% damage Besar ke semua skuad musuh, dengan harga yang membuat semua skuad Anda menerima damage 95%.',
  },
  'Alfred:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Alfred menjalankan misi dalam keadaan darurat. Ketika kekuatan skuad pasukannya turun di bawah 90%/70%/50%/30% untuk pertama kalinya, Alfred akan memiliki peluang 50% lebih besar untuk menggunakan skill tempur dan pasukannya memberikan damage skill 40% lebih banyak dan menerima damage -35%, bertahan selama 1 putaran.',
  },
  'Ramses II:2': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Selama 2 ronde pertama, semua skuad musuh dan sekutu menerima Damage Fisik -45%. Pada ronde 3-6, seluruh skuad Anda memiliki peluang 80% untuk melakukan 2 serangan normal setiap ronde.',
  },
  'Ramses II:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Dalam pertempuran, semua skuad Pemanah Anda memperoleh peluang Pukulan Fatal 40%. Skill ini dapat meningkatkan peluang Pukulan Fatal hingga 60%; bagian yang melampaui batas peluang Pukulan Fatal dikalikan 3 kali dan diubah menjadi tingkat damage Pukulan Fatal.',
  },
  'Ramses II:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Setiap kali skuad Anda memicu "Pukulan Fatal", memulihkan sejumlah kekuatan skuad untuk skuad (tingkat pemulihan: 238%) dan meningkatkan tingkat damage Pukulan Fatal sebanyak 80%[560% maks] (dapat ditumpuk hingga 7 kali), bertahan hingga pertempuran berakhir.',
  },
  'Cleopatra VII:2': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Selama 4 ronde pertama, skuad sekutu dengan kekuatan pasukan terendah memiliki peluang 40% untuk menghindari damage saat diserang. Mulai ronde 4, skuad Anda dengan kekuatan pasukan terendah memulihkan pasukan (tingkat pemulihan: 150%).',
  },
  'Cleopatra VII:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak',
    desc: 'Untuk setiap 2 serangan normal yang dilakukan tiap skuad musuh, Cleopatra memiliki peluang 50% untuk membuat skuad tersebut Bingung sehingga skill dan serangan normalnya memilih target acak. Efek berlangsung selama 1 ronde.',
  },
  'Cleopatra VII:8': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Saat hero mengambil tindakan, peluang 100% membuat skuad musuh yang kebingungan tetap berada dalam status rentan, artinya, setiap kali menerima damage, ia akan menerima 15% lebih banyak damage di waktu berikutnya, yang berlangsung selama 2 putaran; sementara itu, ia mempunyai peluang 50% untuk menerima damage 225% dengan segera.',
  },
  'King Arthur:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Damage yang diterima hero berkurang -80% di awal pertempuran. Setiap kali hero menerima damage, mitigasi berkurang 8%, Resistansi meningkat 20%, dan damage yang ditimbulkan meningkat 10%. Efek dapat ditumpuk hingga 16 lapisan dan bertahan sampai pertempuran berakhir.',
  },
  'King Arthur:5': {
    type: 'Serangan Tambahan',
    target: '1 Musuh Acak',
    desc: 'Arthur menggunakan pedang sucinya; setelah serangan normal, 50% berpeluang menimbulkan 700% damage Fisik ke 1 skuad musuh acak dalam jangkauan yang valid. 40% dari damage ini akan digunakan untuk memulihkan kekuatan pasukan 2 skuad sekutu acak. Setelah melemparkan Pedang dalam Batu, 50% berpeluang menerapkannya ke skuad barisan tengah atau belakang musuh satu kali lagi.',
  },
  'King Arthur:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Arthur mendapat berkat yang secara permanen meningkatkan efek penyembuhan yang diterimanya sebesar 15%. Setiap 6 kali skuad Anda menimbulkan damage, peluang penggunaan Pedang dalam Batu meningkat 4%, dapat ditumpuk hingga 5 lapisan sampai pertempuran berakhir. Saat batas tumpukan tercapai, ada peluang 100% untuk mengabaikan status Penghindaran musuh ketika menimbulkan damage selama 2 ronde.',
  },
  'Leonidas:2': {
    type: 'Serangan Tambahan',
    target: '2 Musuh Acak',
    desc: 'Setelah meluncurkan serangan normal, 40% berpeluang membuat Might -50% dan Resistansi -50% untuk 2 skuad musuh acak dalam jangkauan yang valid dan Membungkam skuad untuk 1 ronde.',
  },
  'Leonidas:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Peluang 50% untuk menimbulkan 220% damage pada 2-3 skuad musuh acak dalam jangkauan yang valid.',
  },
  'Leonidas:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Di 2 ronde pertama, semua skuad Pemanah Anda memulihkan sejumlah HP di setiap ronde (tingkat pemulihan: 55%); Mulai ronde 3, semua skuad Pemanah Anda menerima damage -30% dan mendapatkan efek mencuri nyawa 5%, yang bertahan hingga pertempuran berakhir.',
  },
  'Isabella I:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Pada setiap ronde, ada peluang 70% untuk menyemburkan api naga kepada 1 skuad musuh acak sebanyak 6 kali, menimbulkan Damage Terbakar 83%. Jika semua skuad musuh terkena serangan pada ronde tersebut, 1 skuad sekutu acak mendapat status Kejernihan (kebal terhadap Ditekan, Bungkam, Dilucuti, dan Bingung) selama 1 ronde.',
  },
  'Isabella I:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Mulai ronde 3, dengan konsekuensi terus Terbakar secara permanen, skuad hero memiliki peluang 70% setiap ronde untuk menimbulkan Damage Terbakar 236% kepada 2 skuad musuh acak dan menurunkan Damage Skill Tempur mereka sebesar -20%.',
  },
  'Isabella I:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Memberi perisai kepada skuad yang tetap Sadar berkat skill 2 dan membuat damage yang mereka terima berkurang -50% untuk 2 serangan berikutnya. Saat pertama kali Terbakar, hero memulihkan banyak kekuatan pasukan skuad barisan depan (tingkat pemulihan: 304) dan Menekan 1-2 skuad musuh acak dalam jangkauan valid selama 1 ronde berikutnya.',
  },
  'Desert Storm:2': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak',
    desc: 'Pada ronde 1, 3, dan 5, semua skuad musuh mendapat status Terkutuk, Terbakar, dan Keracunan, lalu menerima damage masing-masing 24%, 29%, dan 34% pada ronde terkait. Efek bertahan hingga pertempuran berakhir.',
  },
  'Desert Storm:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Pada awal ronde 5, 2 skuad sekutu acak memulihkan pasukan setiap ronde (tingkat pemulihan: 60%).',
  },
  'Desert Storm:8': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Peluang 100% untuk menimbulkan damage 243% pada skuad musuh dalam jangkauan, Mengganggu skill penyaluran.',
  },
  'Soaring Hawk:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 40% untuk menimbulkan damage 179% kepada 2 skuad musuh acak dalam jangkauan dan menurunkan Might mereka sebesar -38% selama 2 ronde.',
  },
  'Soaring Hawk:5': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Skuad hero mempunyai peluang 100% untuk melakukan serangan balik ketika serangan dasar, memberikan damage 120% ke sumber penyerang.',
  },
  'Soaring Hawk:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Selama 2 ronde pertama, semua skuad sekutu menerima damage -30%. Setelah ronde 3, skuad hero memulihkan 30% pasukan setiap kali menimbulkan damage.',
  },
  'The Brave:2': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Selama 3 ronde pertama pertempuran, ada peluang 80% setiap ronde untuk Melucuti 2 skuad musuh dalam jangkauan.',
  },
  'The Brave:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 30% untuk membungkam 2 skuad musuh acak dalam jangkauan selama 2 ronde.',
  },
  'The Brave:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak',
    desc: 'Dalam pertempuran, semua skuad musuh kehilangan Might dan Resistansi sebesar -60%, Kecepatan Tempur -100, menerima damage 5% lebih besar, dan menimbulkan damage -5% mulai ronde 5. Semua skuad Kavaleri Anda menimbulkan damage 40% lebih besar.',
  },
  'Jade Eagle:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 40% untuk melancarkan 2 serangan, masing-masing menimbulkan Damage 142% kepada 2 skuad musuh acak dalam jangkauan valid. Setiap serangan memiliki peluang 25% untuk membungkam target selama 1 ronde.',
  },
  'Jade Eagle:4': {
    type: 'Skill Kepemimpinan',
    target: 'Skuad Hero',
    desc: 'Pemanah di skuad hero memiliki 60% Peningkatan Kekuatan, 20% Peningkatan damage yang Diberikan, 20% Peningkatan damage yang Diterima.',
  },
  'Jade Eagle:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 50% untuk menimbulkan damage 310% kepada semua skuad musuh dan memberi debuff berdasarkan jenis pasukan: Infanteri tidak dapat memulihkan pasukan, Kavaleri menerima Damage Skill Tempur -50%, dan Pemanah Dilucuti. Efek berlangsung selama 1 ronde.',
  },
  'Jade Eagle:8': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Pada ronde 2 dan 4, ada peluang 100% untuk menimbulkan Damage Besar 863% kepada 3 skuad musuh acak dalam jangkauan. Target yang Dilucuti atau Ditekan menerima damage 40% lebih besar selama 2 ronde.',
  },
  'Immortal Guardian:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Damage yang diterima skuad hero berkurang -30%.',
  },
  'Immortal Guardian:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Dalam pertempuran, saat 2 skuad musuh acak dalam jangkauan menggunakan skill tempur atau serangan dasar, damage yang mereka timbulkan berkurang -5%. Efek dapat ditumpuk hingga 8 kali.',
  },
  'Immortal Guardian:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Selama 3 ronde pertama, semua skuad sekutu menerima damage -20%. Saat menerima damage, ada peluang 50% untuk memulihkan pasukan (tingkat pemulihan: 45%).',
  },
  'Divine Arrow:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 25% untuk menimbulkan damage 211% kepada 2 musuh acak dan Melucuti mereka selama 1 ronde.',
  },
  'Divine Arrow:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 30% untuk memberi status Rantai yang menghubungkan 2 musuh acak. Saat salah satu skuad menerima damage, skuad lainnya juga menerima damage 25%. Efek berlangsung selama 2 ronde.',
  },
  'Divine Arrow:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Dalam pertempuran, semua Pemanah sekutu mendapat status Damage Area; serangan dasar mereka juga menimbulkan damage 40% kepada 2 skuad musuh di barisan belakang.',
  },
  'Che Liu:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Damage skuad meningkat 50%. Saat kekuatan pasukan tersisa setengah, skuad mendapat tambahan Might dan Resistansi 100%.',
  },
  'Che Liu:5': {
    type: 'Serangan Tambahan',
    target: '1 Musuh Acak',
    desc: 'Setelah Serangan Dasar, peluang 100% untuk menimbulkan damage 247% ke skuad musuh dalam jangkauan',
  },
  'Che Liu:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Peluang 100% untuk melakukan dua serangan normal ketika kekuatan skuad saat ini turun di bawah 50% dari jumlah di awal pertempuran. Ketika skuad hero ini dikalahkan atau moralnya rusak, hero ini akan terus bertarung untuk satu ronde lagi (Saat menyerang wilayah, jika loyalitas Legiun lebih rendah dari Semangat Pemberontak, maka hero tidak akan dapat melanjutkan pertempuran).',
  },
  'War Lord:2': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Selama pertempuran, semua skuad Kavaleri sekutu mendapat Damage Serangan Dasar -20% dan peningkatan Damage Skill Tempur 45%.',
  },
  'War Lord:5': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Selama 2 ronde pertama, setiap kali skuad hero menerima damage, ada peluang 70% untuk melakukan Penghindaran dan meniadakan damage tersebut.',
  },
  'War Lord:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Pada ronde 1, 3, 5, dan 7, ada peluang 100% untuk menaikkan peluang penggunaan skill tempur terakhir milik 1 skuad sekutu acak menjadi 100%. Jika skill memerlukan persiapan, ada peluang 60% untuk melewati 1 ronde persiapan.',
  },
  'Jane:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 35% untuk menimbulkan damage 334.5% kepada semua skuad musuh dalam jangkauan.',
  },
  'Jane:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Ada peluang 30% untuk menimbulkan damage 255% kepada semua skuad musuh dalam jangkauan dan mencegah mereka memulihkan pasukan selama 2 ronde.',
  },
  'Jane:8': {
    type: 'Skill Tempur',
    target: '1 Sekutu Acak',
    desc: 'Selama pertempuran, skuad hero tidak dapat melancarkan serangan dasar sebagai ganti peningkatan damage skill tempur sebesar 35% dan juga memberikan damage skill 301% ke skuad musuh secara acak dalam jangkauan.',
  },
  'Sky Breaker:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 40% untuk menimbulkan damage 325% kepada 2 musuh acak dan menurunkan damage skill mereka sebesar -20% selama 2 ronde.',
  },
  'Sky Breaker:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak',
    desc: 'Selama 2 ronde pertama, Lucuti 2 skuad musuh acak agar tidak dapat melakukan serangan dasar. Pada ronde nomor 2, tim menimbulkan damage 267.5% kepada semua skuad musuh.',
  },
  'Sky Breaker:8': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 50% untuk menimbulkan damage 260% kepada 2 musuh acak, lalu menyembuhkan skuad sendiri dan skuad sekutu acak (tingkat pemulihan: 142%).',
  },
  'Rokuboshuten:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 40% untuk menimbulkan damage 255% kepada 2 musuh acak dan menurunkan Might serta Resistansi mereka sebesar -55% selama 2 ronde.',
  },
  'Rokuboshuten:5': {
    type: 'Skill Status',
    target: '2 Sekutu Acak',
    desc: 'Selama pertempuran, setiap kali menggunakan skill yang memerlukan persiapan, skuad hero memiliki peluang 100% untuk mendapat status Kejernihan (kebal terhadap Bungkam, Dilucuti, Ditekan, dan Bingung) selama 2 ronde. Setelah menggunakan skill tempur, ada peluang 100% untuk meningkatkan Might dan Resistansi dua skuad sekutu acak sebesar 100% selama 2 ronde.',
  },
  'Rokuboshuten:8': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 40% untuk menimbulkan damage 196.5% kepada semua musuh dan membungkam mereka sehingga tidak dapat menggunakan skill tempur selama 1 ronde.',
  },
  'Bleeding Steed:2': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama 3 ronde pertama, 2 skuad sekutu mendapat bonus damage 60%.',
  },
  'Bleeding Steed:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 50% untuk membuat 2 musuh acak Bingung sehingga skill dan serangan dasar mereka memilih target acak selama 2 ronde.',
  },
  'Bleeding Steed:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Selama pertempuran, setiap kali skuad sekutu menerima damage, ada peluang 50% untuk memulihkan pasukan (tingkat pemulihan: 33%).',
  },
  'Rozen Blade:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '30% berpeluang menghilangkan debuff sekutu Kavaleri dan pemanah (tidak termasuk Debuff dari skill pra-pertempuran), memberikan Serangan Dasar mereka 25% berpeluang menyebabkan 1 ronde Penekanan, yang berlangsung selama 1 ronde.',
  },
  'Rozen Blade:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Selama 3 ronde pertama, semua skuad sekutu mendapat 100 Kecepatan Tempur dan peluang 70% untuk melakukan 2 serangan dasar pada setiap ronde. Efek sejenis tidak dapat ditumpuk.',
  },
  'Rozen Blade:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Selama pertempuran, setiap kali 2 skuad musuh acak menerima damage, damage tambahan yang mereka terima meningkat 12%, dapat ditumpuk maksimal 5 kali.',
  },
  'Jade:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: '1 ronde persiapan. 40% peluang untuk menyerang 6 kali, setiap serangan secara acak memilih skuad musuh dalam jangkauan dan memberikan damage 162%.',
  },
  'Jade:5': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Skuad hero menimbulkan damage 10% lebih besar. Efek dapat ditumpuk satu kali pada setiap ronde.',
  },
  'Jade:8': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 40% untuk menimbulkan damage 160% kepada 2 skuad acak dalam jangkauan efektif dan memberi satu skuad musuh status Kutukan. Setiap kali menggunakan skill tempur, skuad terkutuk menerima damage 80%; efek berlangsung selama 2 ronde.',
  },
  'Witch Hunter:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Peluang 30% untuk menimbulkan damage 237% ke semua skuad musuh dalam jangkauan yang valid dan memberikan status Mudah Terbakar pada mereka, meningkatkan damage Pembakaran yang mereka terima sebanyak 35% yang bertahan selama 2.',
  },
  'Witch Hunter:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Selama tiga ronde pertama, 2 skuad musuh acak mendapat Damage Skill Tempur -75% dan peluang 90% untuk Dibungkam sehingga tidak dapat menggunakan skill tempur selama 1 ronde.',
  },
  'Witch Hunter:8': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Ada peluang 40% untuk menyerang semua skuad musuh dalam jangkauan dengan damage 135% dan memberi mereka status Terbakar. Target menerima damage 142% selama 2 ronde.',
  },
  'Peace Bringer:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Setiap ronde, skuad hero memiliki peluang 50% untuk mendapat buff yang membuat damage diterima berkurang -50% pada ronde tersebut. Saat menerima serangan dasar, skuad hero memiliki peluang 35% untuk melakukan Serangan Balik dan menimbulkan damage 190% kepada sumber serangan.',
  },
  'Peace Bringer:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Selama tiga ronde pertama, semua skuad menimbulkan damage -45% dan seluruh skuad Anda menerima damage -20%. Mulai ronde keempat, Damage Skill Tempur skuad Anda meningkat 20% hingga pertempuran berakhir.',
  },
  'Peace Bringer:8': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Ada peluang 30% untuk menimbulkan damage 203% kepada semua skuad musuh dalam jangkauan dan memberi status Rentan. Setiap kali diserang, target menerima damage tambahan 20%; efek berlangsung selama 1 ronde.',
  },
  'Inquisitor:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 ronde persiapan, 35% berpeluang menyerang semua skuad untuk damage 246% dalam jangkauan dan memberikan status Pelucutan Senjata kepada skuad musuh, musuh tidak dapat melakukan serangan normal, bertahan selama 2 ronde.',
  },
  'Inquisitor:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak',
    desc: 'Meningkatkan damage yang diterima dari pemanah sebesar 50% ke semua skuad musuh.',
  },
  'Inquisitor:8': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 35% untuk menimbulkan damage 342% kepada 2 skuad acak dalam jangkauan. Jika target berstatus Mudah Terbakar, ada peluang 50% untuk memberinya status Ditekan sehingga tidak dapat bertindak.',
  },
  'BeastQueen:2': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Pada ronde pertama, Damage Serangan Normal dan Damage Skill Pengejaran semua skuad Anda meningkat 80%. Efek berkurang sebesar 1/4 pada setiap ronde.',
  },
  'BeastQueen:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama 3 ronde pertama, 2 skuad sekutu acak memiliki peluang 70% untuk mendapat status Semburan, membuat serangan normal menimbulkan damage 160% kepada 2 skuad musuh di belakang target.',
  },
  'BeastQueen:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Selama 3 ronde pertama pertempuran, skuad Kavaleri barisan depan memiliki peluang 70% untuk mendapat status Serangan Balik dan membalas damage sebesar 250% kepada sumber serangan saat menerima serangan dasar.',
  },
  'Cao Cao:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 80% untuk menimbulkan damage 157% pada 2 skuad musuh acak dalam jangkauan yang valid.',
  },
  'Cao Cao:5': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Setiap kali Cao Cao mengeluarkan skill tempur, damage pasukannya meningkat sebesar 18%, dapat ditumpuk hingga 10 kali hingga pertempuran berakhir.',
  },
  'Cao Cao:7': {
    type: 'Skill Aktif',
    target: 'Legiun Hero',
    desc: 'Setelah menggunakan skill, formasi hero mendapat bonus Kecepatan Berbaris 100% dan Might Infanteri 70% selama 20 menit, dengan waktu tunggu 15 jam. Saat tidak aktif, 50% efek tetap berlaku dalam pertempuran.',
  },
  'Cao Cao:8': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Peluang 50% untuk menimbulkan damage 396% pada 1 musuh acak dan menerapkan status Goyah, pada skuad tersebut, membuat target menerima 302% lebih banyak damage setiap kali target menerima damage. Efeknya dapat dipicu hingga 3 kali setiap kali skill digunakan, berlangsung selama 1 ronde.',
  },
  'Charles the Great:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '40% berpeluang menimbulkan damage 255% pada 2 skuad musuh acak dalam jangkauan yang valid dan membuat resistensi target -170% selama 2 ronde.',
  },
  'Charles the Great:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Untuk 4 ronde pertama, tingkatkan damage yang ditimbulkan oleh 2 skuad acak di sisi Anda sebesar 20%, dapat ditumpuk hingga 4 kali hingga pertempuran berakhir.',
  },
  'Charles the Great:8': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Peluang 50% untuk menimbulkan damage 510% pada 1 skuad musuh acak dalam rentang yang valid dan memungkinkan skuad barisan belakang Anda memiliki peluang 100% untuk memasuki status Menghindar, 2 kali berikutnya menerima damage.',
  },
  'Black Prince:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 35% untuk menerapkan status 1 dari Menekan, Membungkam, dan Melucuti senjata ke 2 skuad musuh acak dalam rentang yang valid, bertahan selama 2 putaran.',
  },
  'Black Prince:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Tingkat Maks. 60% berpeluang mencuri 200% Resistansi dari 2 skuad musuh acak dalam rentang yang valid, bertahan selama 2 ronde (Dapat ditumpuk hingga 2 kali).',
  },
  'Black Prince:8': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Peluang 50% untuk menimbulkan damage 490% pada 2 skuad musuh acak dalam jangkauan yang valid dan membuat Kekuatan target -150% untuk 2 putaran.',
  },
  'Lionheart:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 40% untuk menimbulkan damage 250% pada 2 skuad musuh acak dalam jangkauan yang valid dan membuat damage skill Lionheart meningkat sebesar 40% untuk 1 ronde.',
  },
  'Lionheart:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Peluang 50% untuk menimbulkan damage 288% pada 2 skuad musuh acak dalam jangkauan yang valid dan 288% lebih banyak damage pada skuad musuh dalam resistensi terendah.',
  },
  'Lionheart:7': {
    type: 'Skill Aktif',
    target: 'Legiun Hero',
    desc: 'Setelah menggunakan skill, formasi hero mendapat bonus Kecepatan Berbaris 100% dan Might Kavaleri 70% selama 20 menit, dengan waktu tunggu 15 jam. Saat tidak aktif, 50% efek tetap berlaku dalam pertempuran.',
  },
  'Lionheart:8': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 ronde persiapan. Peluang 60% untuk menimbulkan damage besar 343% ke semua skuad musuh dalam jangkauan yang valid; saat persiapan, terapkan status Menyerang Lebih Dulu, ke Lionheart untuk 1 ronde.',
  },
  'Al Fatih:2': {
    type: 'Skill Tempur',
    target: '1 Sekutu Acak',
    desc: 'Peluang 80% untuk meningkatkan damage yang diberikan dalam serangan normal yang dilakukan oleh Al Fatih oleh 60% untuk 1 ronde.',
  },
  'Al Fatih:5': {
    type: 'Skill Tempur',
    target: '1 Sekutu Acak',
    desc: 'Al Fatih menargetkan 1 skuad musuh acak dalam serangan normal dan mempunyai peluang 50% untuk melancarkan Pukulan Fatal.',
  },
  'Al Fatih:7': {
    type: 'Skill Aktif',
    target: 'Legiun Hero',
    desc: 'Setelah menggunakan skill, formasi hero mendapat bonus Kecepatan Berbaris 100% dan Might Pemanah 70% selama 20 menit, dengan waktu tunggu 15 jam. Saat tidak aktif, 50% efek tetap berlaku dalam pertempuran.',
  },
  'Al Fatih:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Tingkat damage Pukulan Fatal yang dilakukan oleh Al Fatih meningkat sebesar 60%, dalam efeknya ditumpuk 1 kali setiap ronde hingga 4 kali hingga pertempuran berakhir.',
  },
  'Edward the Confessor:2': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Semua skuad Anda memiliki peluang 100% untuk memasuki status Menghindar saat pertama kali mereka diserang; untuk 4 putaran pertama, mereka memiliki peluang 70% untuk membuat damage skill semua skuad musuh -40% setiap putaran.',
  },
  'Edward the Confessor:5': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Ada peluang 35% untuk menimbulkan damage 480% kepada 1 skuad musuh acak dalam jangkauan valid dan memberinya status Ditekan selama 1 ronde.',
  },
  'Edward the Confessor:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Mulai dari ronde 3, damage Fisik tim acak 2 di sisi Anda dapat ditingkatkan sebesar 30% setiap ronde, dapat ditumpuk hingga 4 kali hingga pertempuran berakhir.',
  },
  'Constantine the Great:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Peluang 45% untuk menimbulkan damage 330% pada 2 skuad musuh acak dalam jangkauan yang valid.',
  },
  'Constantine the Great:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 40% untuk menimbulkan damage 203% pada 2 skuad musuh dalam jangkauan yang valid dan membuat damage skill skuad barisan belakang Anda meningkat sebesar 50% untuk 1 putaran.',
  },
  'Constantine the Great:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Musuh Acak',
    desc: 'Saat semua skuad Anda bersiap untuk skill persiapan, Constantine memiliki peluang 80% untuk menimbulkan damage 304% pada 1 skuad musuh acak dalam jangkauan yang valid.',
  },
  'Genghis Khan:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 ronde persiapan. Peluang 50% untuk menerapkan status Pendarahan ke semua skuad musuh, membuat mereka menerima damage 213% setiap putaran selama 2 putaran.',
  },
  'Genghis Khan:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Peluang 50% untuk menimbulkan damage 202% pada 2 skuad musuh acak dalam jangkauan yang valid. Peluang 50% untuk memberikan 202% lebih banyak damage ke semua skuad musuh.',
  },
  'Genghis Khan:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Setiap kali skuad Anda menggunakan total 4 skill tempur dalam pertempuran, Genghis Khan memulihkan kekuatan pasukan 2 skuad acak di pihak Anda (tingkat pemulihan: 152%).',
  },
  'Jiguang Qi:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Peluang 40% untuk menimbulkan damage 192% ke semua skuad musuh dalam jangkauan yang valid.',
  },
  'Jiguang Qi:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 40% untuk menimbulkan damage 220% kepada 2 skuad musuh dalam jangkauan valid dan menurunkan Damage Fisik yang mereka timbulkan sebesar -40% selama 1 ronde.',
  },
  'Jiguang Qi:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Setiap 2 skill tempur yang digunakan skuad Anda meningkatkan Resistansi Jiguang Qi sebesar 80%. Efek dapat ditumpuk hingga 10 kali dan bertahan sampai pertempuran berakhir.',
  },
  'Valkyrie:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Ada peluang 100% untuk membuat skuad sendiri tidak dapat melakukan serangan normal, meningkatkan damage sebesar 30% selama 2 ronde, dan menimbulkan damage 218% kepada 1 skuad musuh acak dalam jangkauan.',
  },
  'Valkyrie:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 ronde persiapan. Peluang 45% untuk menimbulkan damage 310% pada 3 skuad musuh dalam jangkauan.',
  },
  'Valkyrie:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Keunggulan skuad sendiri saat melawan Infanteri dan Kavaleri meningkat 30%. Pada setiap ronde, ada peluang 70% untuk mengabaikan 50% Resistansi dasar skuad musuh.',
  },
  'Lawman:2': {
    type: 'Skill Status',
    target: '1 Musuh Acak',
    desc: 'Saat skuad sendiri menerima damage, ada peluang 50% untuk menimbulkan damage 63% kepada 2 skuad acak dalam jarak 2.',
  },
  'Lawman:5': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Skuad sendiri dan 1 skuad sekutu acak memulihkan pasukan setiap ronde (tingkat pemulihan: 96.5%).',
  },
  'Lawman:8': {
    type: 'Skill Tempur',
    target: '2 Sekutu Acak',
    desc: 'Ada peluang 40% untuk membuat skuad sendiri menerima damage -30% dan menanggung 30% damage yang diterima 2 skuad sekutu lainnya selama 2 ronde.',
  },
  'Spectral Reaper:2': {
    type: 'Serangan Tambahan',
    target: '1 Musuh Acak',
    desc: 'Setelah serangan dasar, ada peluang 35% untuk menyerang target yang sama sekali lagi dengan damage 742% dan mencegahnya memulihkan pasukan selama 1 ronde.',
  },
  'Spectral Reaper:5': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Ada peluang 40% untuk menimbulkan damage 455% kepada 1 skuad musuh acak dalam jangkauan valid. Ada peluang 90% untuk menambah 1 serangan normal skuad hero per ronde selama 1 ronde.',
  },
  'Spectral Reaper:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Skuad hero menimbulkan damage serangan normal 100% lebih besar. Setelah setiap penggunaan skill tempur, skuad hero mendapat peluang Serangan Tambahan +40% selama 1 ronde. Saat skill musuh menghitung jangkauan efektif, jarak skuad hero dianggap +1 lebih jauh dari musuh.',
  },
  'Defender:2': {
    type: 'Serangan Tambahan',
    target: '1 Sekutu Acak',
    desc: 'Setelah serangan dasar, ada peluang 80% untuk membuat skuad hero menerima damage -20% selama 2 ronde. Status ini dapat ditumpuk.',
  },
  'Defender:5': {
    type: 'Serangan Tambahan',
    target: '1 Musuh Acak',
    desc: 'Setelah serangan dasar, ada peluang 50% untuk menimbulkan damage 310% kepada 1 skuad musuh acak dalam jangkauan dan memulihkan pasukan skuad sendiri (tingkat pemulihan: 67%).',
  },
  'Defender:8': {
    type: 'Skill Tempur',
    target: '2 Sekutu Acak',
    desc: 'Ada peluang 35% untuk membuat 2 skuad sekutu acak menyerang dua kali dengan peningkatan damage 30% selama 2 ronde.',
  },
  'Army Breaker:2': {
    type: 'Skill Tempur',
    target: '2 Sekutu Acak',
    desc: 'Ada peluang 55% untuk memulihkan pasukan 2 skuad sekutu acak dalam jangkauan (tingkat pemulihan: 84%) dan menghapus debuff, kecuali debuff pra-pertempuran.',
  },
  'Army Breaker:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Ada peluang 40% untuk membungkam 2 skuad musuh acak dalam jangkauan dan membuat damage yang mereka timbulkan berkurang -20% selama 2 ronde.',
  },
  'Army Breaker:8': {
    type: 'Skill Tempur',
    target: '3 Sekutu Acak',
    desc: 'Ada peluang 30% untuk memberi semua skuad sekutu peluang 60% memasuki status Penghindaran terhadap 3 damage berikutnya, sekaligus meningkatkan Might dan Resistansi sebesar 47% selama 2 ronde.',
  },
  'The Avalanche:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 60% untuk menimbulkan damage 226% ke beberapa target musuh.',
  },
  'The Avalanche:5': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: '1 ronde persiapan, 40% berpeluang menimbulkan 595% damage pada 1 skuad musuh acak dalam jangkauan, 60% berpeluang menimbulkan 310% damage pada skuad baris belakang musuh, membuat mereka tertindas dan tak mampu mengambil tindakan selama 1 ronde.',
  },
  'The Avalanche:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Dalam pertempuran, skuad sendiri mendapat status Kejernihan (kebal terhadap Bungkam, Dilucuti, Ditekan, dan Bingung), serta peningkatan Might 60% dan damage tambahan 30%.',
  },
  'Dach Tengri:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Ada peluang 100% untuk membuat 1 skuad musuh acak dalam jangkauan menerima damage tambahan 6%, menimbulkan damage 6% lebih rendah, dan kehilangan -38 Kecepatan Tempur. Sementara itu, 2 skuad sekutu acak menerima damage -6%, menimbulkan damage tambahan -6%, dan mendapat 38 Kecepatan Tempur selama 1 ronde.',
  },
  'Dach Tengri:5': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Mulai ronde 4, pada setiap ronde ada peluang 70% untuk mencegah 2 skuad musuh acak dalam jangkauan memulihkan pasukan serta membuat 2 skuad sekutu acak menerima damage -25%.',
  },
  'Dach Tengri:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama 3 ronde pertama, setiap ronde memberi 2 skuad sekutu acak peningkatan damage 7% yang dapat ditumpuk hingga pertempuran berakhir. Mulai ronde 4, mereka mendapat status Damage Area sehingga serangan dasar menimbulkan damage 40% kepada 2 skuad musuh di belakang target sampai pertempuran berakhir.',
  },
  'Tarantula:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 30% untuk menimbulkan damage 641% pada 2 skuad musuh acak dalam jangkauan, sedangkan damage yang ditimbulkan oleh skuad hero dan skuad barisan belakang ditingkatkan sebesar 40% untuk serangan 2 berikutnya. Jika skuad hero berada di barisan belakang, maka mereka memperoleh efek buff damage ganda. Berlangsung 2 putaran.',
  },
  'Tarantula:5': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Ada peluang 35% untuk menimbulkan damage 402% kepada 1 skuad musuh acak dalam jangkauan. Sebelum aksi berikutnya dari skuad barisan belakang, tim menimbulkan damage 403% kepada 1 skuad musuh acak dalam jarak 4 dari skuad tersebut.',
  },
  'Tarantula:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Dalam pertempuran, skuad hero mendapat salah satu buff acak setiap ronde: 1) memulihkan kekuatan pasukan (tingkat pemulihan: 100%); 2) meningkatkan Might, Resistansi, Might Taktis, dan Resistansi Taktis sebesar 60%; atau 3) menerima damage -40%.',
  },
  'Alexander:2': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Musuh Acak',
    desc: 'Pada ronde 1 dan 3, kejutkan 1 skuad musuh secara acak, sehingga skuad tersebut menerima damage tambahan 325% setiap kali menerima damage, berlangsung hingga pertempuran berakhir.',
  },
  'Alexander:5': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Hero menerima damage sebesar -60% lebih sedikit dan mendapatkan efek penyembuhan yang diperbesar 20%, namun damage terbakar yang diterima juga akan ditingkatkan sebesar 300%.',
  },
  'Alexander:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Ada peluang 100% untuk memberi semua skuad musuh status Pendarahan sehingga menerima damage 260% sebelum bertindak pada setiap ronde hingga pertempuran berakhir. Jika skuad hero kehilangan 25% dari total kekuatan pasukan dalam satu ronde, pasukannya dipulihkan di akhir ronde tersebut (tingkat pemulihan: 350%).',
  },
  'Lancelot:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: '1 putaran persiapan. Peluang 50% untuk menimbulkan damage 356% ke semua skuad musuh; Jika target mengalami pengurangan efek penyembuhan atau tidak dapat memulihkan kekuatan skuad, memberikan damage 356% tambahan ke semua skuad musuh, dengan peluang 90% bagi setiap skuad musuh untuk memasuki status Ditekan untuk 1 putaran.',
  },
  'Lancelot:5': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Hero tidak dapat melakukan serangan normal dan efek ini tidak dapat dihapus. Setiap ronde, ada peluang 100% untuk menimbulkan damage 356% kepada 1 skuad musuh acak, lalu hero mendapat salah satu Segel Keberanian, Keadilan, atau Belas Kasih. Keberanian meningkatkan damage 20%; Keadilan meningkatkan Tingkat Penghindaran 10%; Belas Kasih memulihkan pasukan saat pemilik segel bertindak pada setiap ronde (tingkat pemulihan: 67%). Efek bertahan hingga pertempuran berakhir dan dapat ditumpuk hingga 2 lapisan. Setelah ketiga segel diperoleh, skill menargetkan semua skuad musuh.',
  },
  'Lancelot:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Di awal pertempuran, semua skuad sekutu mendapat efek yang memberi peluang 80% untuk melewati 1 ronde persiapan saat menggunakan skill persiapan, efektif hingga 3 kali. Setelah semua pemakaian efek habis, pemiliknya mendapat 1 segel.',
  },
  'Ragnar:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Peluang 50% untuk menimbulkan damage 420% ke skuad musuh acak dalam jangkauan yang valid.',
  },
  'Ragnar:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Di babak 1 menimbulkan damage 160%, di babak 3 menimbulkan damage 320%, di babak 5 menimbulkan damage 480%, dan di babak 7 menimbulkan damage 640% ke masing-masing skuad musuh.',
  },
  'Ragnar:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Setelah menimbulkan damage, ada peluang 50% untuk memberi skuad hero dan skuad barisan belakang tambahan peluang 8% memicu Pukulan Fatal dan Serangan Penghancur. Efek bertahan hingga pertempuran berakhir dan dapat ditumpuk hingga 5 lapisan. Baris terakhir pada tangkapan layar masih perlu dikonfirmasi.',
  },
  'Bjorn:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: '40% berpeluang menyerang 1 skuad musuh acak dalam jangkauan 2 kali, setiap kali menimbulkan damage 348%. Setiap serangan secara acak menargetkan satu musuh.',
  },
  'Bjorn:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Semua skuad teman menimbulkan damage +70% pada skuad musuh yang Dibungkam, Dilucuti, Ditekan, dan Bingung. skuad musuh mempunyai peluang 30% untuk memperpanjang durasi Debuff Kontrol sebanyak 1 ronde (Dibungkam, Dilucuti, Ditekan, dan Bingung).',
  },
  'Bjorn:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Pada 3 putaran pertama, 2 skuad musuh acak dalam jangkauan menimbulkan damage -30%. Pada ronde 4, skuad ini menjadi Bingung, menyerang dan mengeluarkan skill pada target acak untuk 2 ronde.',
  },
  'Skanda:2': {
    type: 'Skill Tempur',
    target: '2 Sekutu Acak',
    desc: 'Peluang 50% untuk menyembuhkan diri sendiri dan skuad barisan depan (tingkat pemulihan 247%). Jika sudah berada di barisan paling depan, gandakan healnya.',
  },
  'Skanda:5': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Peluang 70% untuk menimbulkan damage 260% pada skuad musuh terjauh dalam jangkauan dan Menekan mereka selama 1 ronde.',
  },
  'Skanda:8': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Pada ronde 5, hapus debuff skuad sekutu di barisan depan. Saat target menerima damage, ada peluang 100% untuk melakukan Penghindaran dan menjadi kebal terhadap damage tersebut selama 2 ronde.',
  },
  'Liberator:2': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: '50% berpeluang melakukan serangan balik untuk menimbulkan damage 150% saat terkena serangan normal. Selain itu, peluang 50% bagi skuad Anda untuk menerima -60% Damage Skill setiap ronde, yang berlangsung selama 1 ronde.',
  },
  'Liberator:5': {
    type: 'Serangan Tambahan',
    target: '1 Sekutu Acak',
    desc: 'Serangan normal memiliki peluang 80% untuk menerapkan Blokir Pemulihan Pasukan selama 1 ronde. Ada juga peluang 70% untuk memberi status Pikiran Jernih kepada barisan belakang, membuatnya kebal terhadap Bungkam, Dilucuti, Ditekan, dan Bingung selama 1 ronde.',
  },
  'Liberator:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Sekutu Acak',
    desc: 'Saat skuad hero berada di barisan depan, semua skuad sekutu menerima damage -20% lebih sedikit pada 3 putaran pertama. Mulai dari ronde 4, 40% dari damage yang ditimbulkan oleh skuad baris belakang Anda diubah menjadi pemulihan skuad baris depan setelah efeknya berakhir.',
  },
  'Ashen Verdict:2': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak',
    desc: 'Putusan Ashen mendapatkan 1 Tanda Pengejaran untuk setiap serangan normal yang dilakukan oleh skuad Anda. Ketika Tanda terakumulasi hingga 7, semua skuad musuh menerima damage tambahan sebesar 400% dan semua Tanda yang ada dihapus.',
  },
  'Ashen Verdict:5': {
    type: 'Skill Tempur',
    target: '1 Sekutu Acak',
    desc: 'Peluang 35% bagi skuad hero untuk mendapatkan 1 serangan normal tambahan setiap ronde, berlangsung selama 2 ronde. Skuad kebal terhadap Dilucuti selama durasi tersebut.',
  },
  'Ashen Verdict:8': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Skuad hero mempunyai peluang 35% untuk menerapkan satu kondisi ke skuad musuh acak setelah setiap 2 serangan normal: Dilucuti, Dibungkam, Bingung, Diganggu, atau Pemulihan skuad Diblokir. Probabilitas ditentukan secara independen untuk setiap efek. Semua efek berlangsung selama 1 ronde.',
  },
  'Warden:2': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Sekutu Acak',
    desc: 'Selama 4 ronde pertama, peluang penggunaan skill nomor 5 milik kedua hero lainnya meningkat 10%, khusus skill Tempur dan Pasif. Pada ronde 5, peluang penggunaan skill meningkat 30%, tetapi hanya untuk skill nomor 5 milik salah satu dari kedua hero tersebut.',
  },
  'Warden:5': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak, Sekutu Acak',
    desc: 'Saat berada dalam status kontrol (Dibungkam, Dilucuti, Ditekan, atau Bingung), skuad Anda menerima damage -70%. Efeknya dapat terpicu hingga 3 kali pada satu skuad dalam pertempuran. pada ronde 1 dan 5, berikan damage 510% ke skuad musuh secara acak.',
  },
  'Warden:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak',
    desc: 'Selama pertempuran, serangan normal dinonaktifkan untuk skuad hero, tetapi skuad barisan belakang Anda mendapatkan buff: +1 serangan normal per putaran. Setiap serangan normal meningkatkan damage skill berikutnya sebesar 12%, ditumpuk hingga 5 putaran.',
  },
  'Warhammer:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak, Sekutu Acak',
    desc: 'Setiap kali skuad sekutu menerima damage, dapatkan +1 lapisan Muatan Armor Refleksi. Saat mencapai 9 lapisan, berikan Perisai Refleksi kepada skuad sekutu acak, dengan peluang 30% menambahkan satu lapisan lagi. Perisai meniadakan 100% damage masuk berikutnya, memantulkannya kepada penyerang, dan melindungi pemegang perisai dari damage tersebut. Setelah perisai diberikan, seluruh lapisan Armor Refleksi direset.',
  },
  'Warhammer:5': {
    type: 'Skill Tempur',
    target: '3 Musuh Acak, Sekutu Acak',
    desc: 'Ada peluang 100% untuk menimbulkan damage 108% kepada semua skuad musuh, tetapi seluruh skuad sekutu menerima 20% dari damage yang ditimbulkan kepada musuh. Damage ini menambah Muatan Armor Refleksi.',
  },
  'Warhammer:8': {
    type: 'Skill Pra-Pertempuran',
    target: '3 Musuh Acak, Sekutu Acak',
    desc: 'Mengurangi Pemulihan skuad untuk skuad musuh dan kawan sebanyak -25%. Mulai ronde 4, kurangi Efek Pemulihan skuad untuk semua skuad musuh sebesar -15% per ronde. Efek ini bertumpuk dan bertahan hingga akhir pertarungan.',
  },
  'Eidolon:2': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Skuad hero memiliki Tingkat Penghindaran dasar 10% dan memperoleh bonus 25% setiap kali mereka menerima damage, ditumpuk hingga 100%. Setelah skuad berhasil menghindari serangan, bonus Tingkat Penghindaran dihapus.',
  },
  'Eidolon:5': {
    type: 'Skill Tempur',
    target: '2 Sekutu Acak',
    desc: 'Peluang 40% untuk memicu: 2 skuad teman lainnya menyedot 60% Kekuatan dan Perlawanan dari 1 skuad musuh acak. Selain itu, setiap serangan dasar memiliki peluang 100% untuk menghasilkan damage bonus 250% untuk 1 putaran.',
  },
  'Eidolon:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Skuad hero memiliki peluang 33% untuk memulihkan 80% pasukan setelah berhasil melakukan Penghindaran, peluang 33% untuk mendapat pengurangan damage sebesar -35%, dan peluang 33% untuk membuat 2 skuad musuh acak menerima damage 15% lebih besar. Setiap peluang dihitung secara terpisah dan tidak bertumpuk. Setiap efek berlangsung selama 2 ronde.',
  },
  'Scarlet Reaver:2': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Ada peluang 100% untuk menimbulkan damage 100% kepada skuad musuh di barisan depan, serta peluang 40% untuk menimbulkan damage tambahan 500% kepada skuad musuh dengan pasukan paling sedikit.',
  },
  'Scarlet Reaver:5': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: '1 ronde persiapan. 40% berpeluang menyerang 5 kali, dengan setiap serangan memilih skuad musuh secara acak dan menimbulkan damage 150%. Setiap serangan juga memiliki peluang 65% untuk menerapkan status 1 ronde berdasarkan skuad musuh: Pelucutan Senjata untuk Pemanah, Bungkam untuk Infanteri, dan Kavaleri. Pelucutan Senjata dan Bungkam dapat ditumpuk hingga 2 tumpukan.',
  },
  'Scarlet Reaver:8': {
    type: 'Skill Pra-Pertempuran',
    target: '2 Musuh Acak',
    desc: 'Pada ronde 1, 4, dan 7, beri 2 skuad musuh acak status Terbakar selama 2 ronde yang menimbulkan damage 150% setiap ronde. Skuad hero mendapat keunggulan 35% terhadap Kavaleri, dan semua skuad sekutu menimbulkan Damage Skill +50% kepada target Terbakar.',
  },
  'Rainforest Ranger:2': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Sekutu Acak',
    desc: 'Damage yang diberikan skuad hero ini mengabaikan 25% dari resistensi dasar skuad musuh. Untuk 3 putaran pertama, serangan normal skuad hero ini mengunci skuad musuh di posisi yang sama dan mengabaikan dua kali lipat jumlah resistensi dasar.',
  },
  'Rainforest Ranger:5': {
    type: 'Serangan Tambahan',
    target: '1 Musuh Acak',
    desc: 'Peluang 50% setelah serangan normal untuk memberikan damage bonus 350% ke target. Ada peluang 50% ketika damage bonus dipicu untuk memberikan Penekanan pada 1 musuh acak selama 1 ronde.',
  },
  'Rainforest Ranger:8': {
    type: 'Serangan Tambahan',
    target: '1 Sekutu Acak',
    desc: 'Setelah serangan normal, ada peluang 35% untuk menimbulkan Damage Tambahan 600% kepada target. Damage ini meningkat menjadi 810% jika kekuatan pasukan target 50% lebih rendah daripada saat awal pertempuran.',
  },
  'Fortuneteller:2': {
    type: 'Skill Pra-Pertempuran',
    target: '1 Musuh Acak',
    desc: 'Tandai 1 skuad musuh acak dan kurangi Pemulihan skuad mereka sebanyak -70%, lalu berikan debuff berdasarkan jenis skuad yang ditandai. Infanteri: semua skuad musuh menerima +20% lebih sedikit damage serangan normal. Pemanah: semua skuad musuh memberikan -40% lebih sedikit damage serangan normal. Kavaleri: semua skuad musuh memberikan -30% lebih sedikit Damage Skill.',
  },
  'Fortuneteller:5': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: 'Peluang 50% untuk menghubungkan 1 skuad musuh acak dengan skuad yang ditandai untuk 2 putaran. Ketika salah satu skuad menerima damage, skuad lainnya menerima 50% dari damage tersebut.',
  },
  'Fortuneteller:8': {
    type: 'Skill Tempur',
    target: '1 Musuh Acak',
    desc: 'Dapatkan +1 Muatan setiap kali skuad sekutu menggunakan skill tempur. Setelah 6 Muatan terkumpul, tim menimbulkan damage 750% kepada skuad yang ditandai dan Menekannya selama 1 ronde.',
  },
  'Cyrus:2': {
    type: 'Skill Tempur',
    target: '2 Musuh Acak',
    desc: '1 ronde persiapan. Ada peluang 65% untuk menimbulkan damage 325% kepada 2 skuad musuh acak dan mencegah mereka memulihkan kekuatan pasukan selama 1 ronde. Skill ini memiliki peluang 80% untuk melewati tahap persiapan dan langsung digunakan.',
  },
  'Cyrus:5': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Semua skuad Kavaleri teman mendapatkan efek Kavaleri Badai: saat menggunakan skill aktif, menimbulkan damage 40% lebih besar; saat mengeluarkan skill mengejar, damage yang diterima dikurangi sebesar 40%, bertahan selama 2 putaran. Ketika salah satu skuad Anda memicu efek Kavaleri Badai, Cyrus memperoleh efek sebesar 50%, dapat ditumpuk hingga 5 lapisan, dan bertahan hingga akhir pertempuran.',
  },
  'Cyrus:8': {
    type: 'Skill Status',
    target: '1 Sekutu Acak',
    desc: 'Skuad Cyrus memiliki peluang Penghindaran 10%. Setelah Penghindaran berhasil, Cyrus mendapat salah satu efek acak, termasuk Menyerang Lebih Dulu dan Sadar. Jika Penghindaran gagal, semua skuad Anda langsung mendapat status Sadar selama 1 ronde dan efek yang mengurangi damage masuk berikutnya sebesar 50%, efektif satu kali per ronde.',
  },
};

const strings = {
  '1 random friendly squad within effective range': '1 skuad sekutu acak dalam jangkauan efektif',
  '3 random friendly squads within effective range': '3 skuad sekutu acak dalam jangkauan efektif',
  'A castable battle skill. Some have prep time, chance to trigger, range, and target rules.':
    'Skill tempur yang dapat digunakan. Beberapa memiliki waktu persiapan, peluang untuk memicu, jangkauan, dan aturan target.',
  'A cleansing or control-resistance state that helps remove or avoid negative effects.':
    'Keadaan pembersihan atau resistensi kontrol yang membantu menghilangkan atau menghindari efek negatif.',
  'A commander-style passive effect that usually applies as long as the hero is in the legion.':
    'Efek pasif ala komandan yang biasanya berlaku selama hero berada dalam legiun.',
  'A control-immunity or cleansing state; usually protects from disabling effects for its duration.':
    'Keadaan kekebalan kontrol atau pembersihan; biasanya melindungi dari efek penonaktifan selama durasinya.',
  'A damage-over-time status that keeps hurting the affected squad while active.':
    'Status damage seiring waktu yang terus melukai skuad yang terkena dampak saat aktif.',
  'A damage-over-time style status that keeps hurting the affected squad while active.':
    'Status gaya damage seiring waktu yang terus melukai skuad yang terkena dampak saat aktif.',
  'A disabling status such as Silence, Disarm, Suppress, or Confuse.':
    'Status penonaktifan seperti Bungkam, Pelucutan Senjata, Menekan, atau Bingung.',
  'A normal attack state that hits additional enemy squads beyond the main target.':
    'Keadaan serangan normal yang mengenai skuad musuh tambahan di luar target utama.',
  'A passive/status-driven skill that changes states, immunities, damage rules, or ongoing battle behavior.':
    'Skill pasif/berbasis status yang mengubah status, kekebalan, aturan damage, atau perilaku pertempuran yang sedang berlangsung.',
  'A skill that can trigger during battle when its conditions and chance roll are met.':
    'Skill yang dapat terpicu selama pertempuran ketika kondisi dan peluangnya terpenuhi.',
  'A special damage effect that can bypass or punish defenses depending on the skill.':
    'Efek damage khusus yang dapat melewati atau menghukum pertahanan tergantung pada skillnya.',
  'A special strike effect with its own chance and damage rate, often scaling with buffs.':
    'Efek serangan khusus dengan peluang dan tingkat kerusakannya sendiri, sering kali ditingkatkan dengan buff.',
  'A stackable buff used by some heroes to increase follow-up effects, damage, or trigger chances.':
    'Buff yang dapat ditumpuk yang digunakan oleh beberapa hero untuk meningkatkan efek tindak lanjut, damage, atau peluang pemicu.',
  'A status that makes the target vulnerable to fire-related effects.':
    'Status yang membuat target rentan terhadap dampak terkait kebakaran.',
  'A weakening status that reduces effectiveness while active.':
    'Status melemah yang mengurangi efektivitas saat aktif.',
  'Active Skill': 'Skill Aktif',
  'Acts before enemy squads, which can unlock extra skill effects for some heroes.':
    'Bertindak di depan skuad musuh, yang dapat membuka efek skill tambahan untuk beberapa hero.',
  'Additional Attack': 'Serangan Tambahan',
  'Adds or modifies normal attacks, often creating extra hits or effects after attacks.':
    'Menambah atau memodifikasi serangan normal, sering kali menciptakan pukulan atau efek tambahan setelah serangan.',
  'Affected squad may attack or cast skills on random targets.':
    'Skuad yang terkena dampak dapat menyerang atau mengeluarkan skill pada target acak.',
  'Affected squad takes more damage or loses protection while active.':
    'Skuad yang terkena dampak menerima lebih banyak damage atau kehilangan perlindungan saat aktif.',
  'All Biography Attributes activated': 'Semua Atribut Biografi aktif',
  'Applies before or at battle start, often setting buffs, debuffs, opening conditions, or early-round rules.':
    'Berlaku sebelum atau saat pertempuran dimulai, sering kali mengatur buff, debuff, kondisi pembukaan, atau aturan ronde awal.',
  'Armor break': 'Penghancur Armor',
  'Army Defense': 'DEF Pasukan',
  'Army HP': 'HP Pasukan',
  'Army Might': 'Might Pasukan',
  'Arthur Pendragon the Once and Future King': 'Arthur Pendragon, Sang Raja Dulu dan Kelak',
  'Avoids an incoming damage instance or attack while active.':
    'Menghindari kejadian damage atau serangan yang masuk saat aktif.',
  Biography: 'Biografi',
  'Biography attributes': 'Atribut biografi',
  'Biography Attributes': 'Atribut Biografi',
  'Biography skin details pending': 'Detail Skin Biografi segera hadir',
  'Biography: Hidden Power': 'Biografi: Kekuatan Tersembunyi',
  Bleeding: 'Pendarahan',
  'Captured screenshot shows Eternity at Lv.10 and max level reached.':
    'Tangkapan layar menunjukkan Keabadian pada Lv.10 dan level maksimal telah tercapai.',
  Chain: 'Rantai',
  Clarity: 'Kejernihan',
  'Combat Skill': 'Skill Tempur',
  'Combat Skill Damage': 'Damage Skill Tempur',
  Confuse: 'Kebingungan',
  Confused: 'Bingung',
  'Control Debuff': 'Debuff Kontrol',
  'Counter-attack': 'Serangan Balik',
  Counterattack: 'Serangan Balik',
  Cursed: 'Terkutuk',
  'Damage dealt by a skill rather than a normal attack.':
    'Damage diberikan oleh skill, bukan serangan normal.',
  'Damage dealt specifically by combat skills, not normal attacks.':
    'Damage diberikan secara khusus oleh skill tempur, bukan serangan normal.',
  'Damage or effects can jump from one squad to another.':
    'Damage atau efek dapat melompat dari satu skuad ke skuad lainnya.',
  'Damage spills onto nearby or additional squads.':
    'Damage meluas ke skuad terdekat atau skuad tambahan.',
  'Damage taken': 'Damage Diterima',
  'Damage taken by the hero is reduced by 80% at the start of battle. Each time the hero takes damage, the mitigation is reduced by 8% (reduced by 4% each time for the first 3 rounds), while Resistance increases by 20% and Damage dealt increases by 10%, stackable up to 20 layers, until battle ends.':
    'Damage yang diterima hero dikurangi sebesar 80% di awal pertempuran. Setiap kali hero menerima damage, mitigasinya dikurangi sebesar 8% (dikurangi sebesar 4% setiap kali untuk 3 putaran pertama), sementara Resistensi meningkat sebesar 20% dan damage yang diberikan meningkat sebesar 10%, dapat ditumpuk hingga 20 lapisan, hingga pertempuran berakhir.',
  'Damage type usually tied to normal or physical strikes.':
    'Jenis damage biasanya dikaitkan dengan serangan normal atau fisik.',
  'Deals damage back after being attacked or after a matching trigger.':
    'Memberikan damage kembali setelah diserang atau setelah pemicu yang cocok.',
  Defend: 'Bertahan',
  'Destructive Strike': 'Serangan Penghancur',
  'Details pending': 'Detail segera hadir',
  Disarm: 'Pelucutan Senjata',
  Disarmed: 'Dilucuti',
  Dodge: 'Penghindaran',
  Dodging: 'Menghindar',
  'Dynamic icon behavior pending capture.': 'Perilaku ikon dinamis menunggu tangkapan layar.',
  'Dynamic icon capture pending.': 'Tangkapan ikon dinamis segera hadir.',
  Eternity: 'Keabadian',
  Everlasting: 'Abadi',
  Faltering: 'Goyah',
  'Fatal Blow': 'Pukulan Fatal',
  Feverish: 'Membara',
  'First to Attack': 'Menyerang Lebih Dulu',
  'First-Aid': 'Pertolongan Pertama',
  Flammable: 'Mudah Terbakar',
  Footmen: 'Infanteri',
  'Forces or redirects enemy attacks toward the taunting squad.':
    'Memaksa atau mengalihkan serangan musuh ke arah skuad pengejek.',
  Healing: 'Penyembuhan',
  'Healing or recovery effect that restores troop power.':
    'Efek penyembuhan atau pemulihan yang memulihkan kekuatan skuad.',
  Inheriting: 'Warisan',
  'Inheriting Skill': 'Skill Warisan',
  'Inheriting skill details pending.': 'Detail Skill Warisan segera hadir.',
  'Inheriting skill details will be added after capture.':
    'Detail Skill Warisan akan ditambahkan setelah gambar tersedia.',
  Interrupting: 'Interupsi',
  'Leadership Skill': 'Skill Kepemimpinan',
  Legendary: 'Legendaris',
  'Mass Attack': 'Serangan Massal',
  Melee: 'Jarak Dekat',
  'More unlocked Biography Skin variants can add stronger Hidden Power when a hero has additional variants.':
    'Semakin banyak varian Skin Biografi yang terbuka dapat menambah Kekuatan Tersembunyi yang lebih kuat ketika suatu hero memiliki varian tambahan.',
  Mythic: 'Mitik',
  'Normal Attack': 'Serangan Normal',
  'Own 2 Biography Skin variants': 'Miliki 2 varian Skin Biografi',
  'Owned skin bonus': 'Bonus skin yang dimiliki',
  pending: 'Segera hadir',
  'Physical Damage': 'Damage Fisik',
  Poisoned: 'Keracunan',
  'Pre-Battle Skill': 'Skill Pra-Pertempuran',
  'Pre-Battle Skills': 'Skill Pra-Pertempuran',
  'Prep Skills': 'Skill Persiapan',
  Preserving: 'Pelestarian',
  'Preserving Skill': 'Skill Pelestarian',
  'Preserving skill and dynamic icon details pending.':
    'Detail Skill Pelestarian dan ikon dinamis segera hadir.',
  'Preserving skill details will be added after capture.':
    'Detail Skill Pelestarian akan ditambahkan setelah gambar tersedia.',
  'Preserving unlock items': 'Item pembuka Pelestarian',
  'Prevents affected squads from recovering troop power while active.':
    'Mencegah skuad yang terkena dampak memulihkan kekuatan skuad saat aktif.',
  'Prevents combat skill casting while active.': 'Mencegah penggunaan skill tempur saat aktif.',
  'Prevents normal attacks while active.': 'Mencegah serangan normal saat aktif.',
  'Prevents the squad from acting or casting depending on the skill wording.':
    'Mencegah skuad bertindak atau menggunakan skill, sesuai deskripsi skill.',
  'Punishes the affected squad when it performs certain actions, often skill casting.':
    'Menghukum skuad yang terkena dampak ketika melakukan tindakan tertentu, sering kali menggunakan skill.',
  Recovery: 'Pemulihan',
  'Reduces defensive value, making affected squads take more damage.':
    'Mengurangi nilai pertahanan, membuat skuad yang terkena dampak menerima lebih banyak damage.',
  'Replaces Wheel of Fortune with Eternity when the skin reaches Star 2.':
    'Mengganti Roda Keberuntungan dengan Keabadian saat skin mencapai Bintang 2.',
  Resistance: 'Resistansi',
  'Restores troop power to one or more squads.':
    'Mengembalikan kekuatan skuad ke satu atau lebih skuad.',
  'Restores troop power; usually shown as a recovery rate.':
    'Mengembalikan kekuatan skuad; biasanya ditampilkan sebagai tingkat pemulihan.',
  'Returns or restores a defeated or heavily damaged squad effect depending on the skill.':
    'Mengembalikan atau memulihkan efek skuad yang dikalahkan atau mengalami damage berat tergantung pada skillnya.',
  Revived: 'Dihidupkan Kembali',
  'Royal Exclusive': 'Eksklusif Kerajaan',
  S: 'S',
  S1: 'S1',
  S2: 'S2',
  S3: 'S3',
  S4: 'S4',
  Silence: 'Bungkam',
  Silenced: 'Dibungkam',
  'Skill activated': 'Skill aktif',
  'Skill Damage': 'Damage Skill',
  'Skills that need one or more rounds of preparation before firing.':
    'Skill yang memerlukan satu atau lebih putaran persiapan sebelum aktif.',
  'Skin advancement complete': 'Peningkatan skin selesai',
  'Skin advancement unlocks the upgraded hero skill.':
    'Kemajuan skin membuka kunci skill hero yang ditingkatkan.',
  'Skin ownership grants biography attributes once details are captured.':
    'Kepemilikan skin memberikan Atribut Biografi setelah detail tersedia.',
  'Skin ownership grants the biography attributes by default.':
    'Kepemilikan skin memberikan atribut biografi secara default.',
  Sober: 'Sadar',
  'Solid Shield': 'Perisai Kokoh',
  'Some heroes have more than one Biography Skin variant. Those variants share the same Biography Attributes and progress; owning more than one variant unlocks Hidden Power.':
    'Beberapa hero memiliki lebih dari satu varian Skin Biografi. Varian tersebut memiliki Atribut dan kemajuan Biografi yang sama; memiliki lebih dari satu varian akan membuka Kekuatan Tersembunyi.',
  SP: 'SP',
  'Special preserving unlock items add the preserving skill and moving icon.':
    'Item buka kunci pelestarian khusus menambahkan skill melestarikan dan ikon bergerak.',
  Splash: 'Damage Area',
  'Star 1': 'Bintang 1',
  'Star 2': 'Bintang 2',
  'Star 3': 'Bintang 3',
  'Star 3 uses the same unique icon with a small in-place movement.':
    'Bintang 3 menggunakan ikon unik yang sama dengan gerakan kecil di tempat.',
  'Status Skill': 'Skill Status',
  'Stops a channeling or prep skill before it completes.':
    'Menghentikan skill penyaluran atau persiapan sebelum selesai.',
  Suppress: 'Menekan',
  Suppressed: 'Ditekan',
  'Tactical Might': 'Might Taktis',
  'Tactical Resistance': 'Resistansi Taktis',
  Taunt: 'Provokasi',
  Taunting: 'Memprovokasi',
  'The basic attack a squad performs without casting a combat skill.':
    'Serangan dasar yang dilakukan suatu skuad tanpa mengeluarkan skill tempur.',
  "The Hero's squad": 'Skuad Hero',
  "The hero's squad gains 4% HP and takes 2% less damage.":
    'Skuad hero memperoleh 4% HP dan menerima 2% lebih sedikit damage.',
  "The Hero's squad takes -10% Skill Damage; the Hero's Legion gains 13% Resistance.":
    'Skuad hero menerima -10% Damage Skill; Legiun hero memperoleh 13% Resistansi.',
  'The Once and Future King': 'Sang Raja Dulu dan Kelak',
  'The same unique icon moves slightly in place after the preserving skill is unlocked.':
    'Ikon unik yang sama bergerak sedikit di tempatnya setelah skill pelestarian dibuka.',
  'Troop Damage': 'Damage Pasukan',
  'Troop Recovery Block': 'Blokir Pemulihan Pasukan',
  'Unique icon becomes available with the inheriting skill.':
    'Ikon unik tersedia dengan skill yang diwarisi.',
  'Unique skin icon available when the inheriting skill is unlocked.':
    'Ikon skin unik tersedia saat skill yang diwarisi dibuka.',
  Vulnerable: 'Rentan',
  'Wheel of Fortune': 'Roda Keberuntungan',
};

export default { skills, strings };
