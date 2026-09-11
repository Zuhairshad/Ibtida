package expo.modules.ibadahnative

/**
 * Rotating dhikr + motivational content shown on every phone unlock.
 * 56 entries (one per slot in the week × 8 content themes) cycle via
 * SharedPreferences so the user never sees the same message twice in a row.
 */
object DhikrUnlockContent {

    data class Entry(val title: String, val body: String)

    val ENTRIES: List<Entry> = listOf(
        // ── Tasbih ────────────────────────────────────────────────────────────
        Entry(
            "سُبْحَانَ اللهِ",
            "A tree is planted for you in Jannah for every SubhanAllah. — Tirmidhi 3464"
        ),
        Entry(
            "الْحَمْدُ لِلَّهِ",
            "Alhamdulillah fills the scale of deeds. Say it now. — Sahih Muslim 223"
        ),
        Entry(
            "اللهُ أَكْبَرُ",
            "Two words light on the tongue, heavy on the scale, beloved to Allah: SubhanAllahil Azeem. — Sahih Bukhari 6682"
        ),
        Entry(
            "لَا إِلَٰهَ إِلَّا اللَّهُ",
            "The best dhikr is La ilaha illallah. One breath, maximum weight. — Tirmidhi 3383"
        ),
        Entry(
            "أَسْتَغْفِرُ اللهَ",
            "The Prophet ﷺ sought forgiveness 100 times a day. Join him. — Sahih Muslim 2702"
        ),
        Entry(
            "سُبْحَانَ اللهِ وَبِحَمْدِهِ",
            "Whoever says this 100 times — sins forgiven even if like sea foam. — Sahih Bukhari 6405"
        ),
        Entry(
            "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ",
            "One Durood on the Prophet ﷺ — Allah sends 10 blessings back to you. — Sahih Muslim 408"
        ),

        // ── Quranic reminders ─────────────────────────────────────────────────
        Entry(
            "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
            "\"With every hardship comes ease.\" — Quran 94:6. Allah has not forgotten you."
        ),
        Entry(
            "وَاللَّهُ مَعَكُمْ",
            "\"Allah is with you.\" — Quran 47:35. Every moment. Including this one."
        ),
        Entry(
            "فَاذْكُرُونِي أَذْكُرْكُمْ",
            "\"Remember Me — I will remember you.\" — Quran 2:152. Say SubhanAllah now."
        ),
        Entry(
            "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
            "\"In the remembrance of Allah hearts find rest.\" — Quran 13:28. Pause. Breathe. Remember."
        ),
        Entry(
            "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ",
            "\"He is with you wherever you are.\" — Quran 57:4. You are never alone."
        ),
        Entry(
            "رَبِّ اشْرَحْ لِي صَدْرِي",
            "\"My Lord, expand my chest and ease my task.\" — Quran 20:25. Say this now."
        ),
        Entry(
            "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
            "Ibrahim ﷺ said this as he was thrown into fire — and Allah made it cool. Trust Him."
        ),

        // ── Prayer reminders ──────────────────────────────────────────────────
        Entry(
            "الصَّلَاةُ عِمَادُ الدِّينِ",
            "Prayer is the pillar of the religion. Have you prayed today? — Hadith"
        ),
        Entry(
            "قُومُوا إِلَى الصَّلَاةِ",
            "\"Rise to prayer.\" The call is always open. Allah is waiting. — Quran 2:238"
        ),
        Entry(
            "أَقِمِ الصَّلَاةَ لِذِكْرِي",
            "\"Establish prayer for My remembrance.\" — Quran 20:14. The screen can wait."
        ),
        Entry(
            "صَلِّ قَبْلَ أَنْ يُصَلَّى عَلَيْكَ",
            "\"Pray before you are prayed upon.\" Every prayer is a gift you give your future self."
        ),
        Entry(
            "أَقْرَبُ مَا يَكُونُ الْعَبْدُ مِنْ رَبِّهِ",
            "\"The closest you are to Allah is while in sujood.\" — Sahih Muslim 482. Pray now."
        ),
        Entry(
            "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ",
            "\"Prayer has been decreed upon the believers at specified times.\" — Quran 4:103"
        ),
        Entry(
            "الصَّلَاةُ نُورٌ",
            "\"Prayer is light.\" — Sahih Muslim 223. Let it light your day."
        ),

        // ── Gratitude ─────────────────────────────────────────────────────────
        Entry(
            "الْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ",
            "Praise Allah in every state. This moment — breathing, alive — is a gift. Alhamdulillah."
        ),
        Entry(
            "لَئِنْ شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
            "\"If you are grateful, I will give you more.\" — Quran 14:7. Gratitude unlocks abundance."
        ),
        Entry(
            "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ",
            "\"O Allah, help me remember You, thank You, and worship You well.\" — Abu Dawud 1522"
        ),
        Entry(
            "نِعْمَةُ الصِّحَّةِ",
            "\"Two blessings most neglected: health and free time.\" — Sahih Bukhari 6412. Use them."
        ),
        Entry(
            "كُنْ مَعَ اللَّهِ",
            "Be with Allah — and Allah will be with you. Every unlock is a new chance."
        ),
        Entry(
            "الشُّكْرُ يَزِيدُ النِّعَمَ",
            "Gratitude multiplies blessings. Name one blessing right now. Alhamdulillah for it."
        ),
        Entry(
            "هَذَا مِنْ فَضْلِ رَبِّي",
            "\"This is from the grace of my Lord.\" — Quran 27:40. Your phone, your time — use them for Him."
        ),

        // ── Tawbah / Istighfar ────────────────────────────────────────────────
        Entry(
            "التَّوْبَةُ تَجُبُّ مَا قَبْلَهَا",
            "Repentance erases what came before. Three seconds: Astaghfirullah. — Hadith"
        ),
        Entry(
            "إِنَّ اللَّهَ يَقْبَلُ التَّوْبَةَ",
            "\"Allah accepts repentance from His servants.\" — Quran 9:104. He is waiting. Return."
        ),
        Entry(
            "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ",
            "The Prophet ﷺ: \"I seek forgiveness 70–100 times a day.\" How many times today?"
        ),
        Entry(
            "رَبَّنَا ظَلَمْنَا أَنفُسَنَا",
            "\"Our Lord, we have wronged ourselves — forgive us.\" — Quran 7:23. Say it sincerely."
        ),
        Entry(
            "وَمَن يَعْمَلْ سُوءًا أَوْ يَظْلِمْ نَفْسَهُ",
            "\"Whoever does wrong then seeks forgiveness — will find Allah forgiving and merciful.\" — Quran 4:110"
        ),
        Entry(
            "كُلُّ ابْنِ آدَمَ خَطَّاءٌ",
            "\"Every child of Adam sins — and the best of sinners are those who repent.\" — Tirmidhi 2499"
        ),
        Entry(
            "بَابُ التَّوْبَةِ مَفْتُوحٌ",
            "The door of tawbah is open until the sun rises from the west. Step through it now."
        ),

        // ── Du'a prompts ──────────────────────────────────────────────────────
        Entry(
            "ادْعُونِي أَسْتَجِبْ لَكُمْ",
            "\"Call upon Me — I will respond.\" — Quran 40:60. Make du'a right now. He is listening."
        ),
        Entry(
            "الدُّعَاءُ هُوَ الْعِبَادَةُ",
            "\"Du'a is worship.\" — Tirmidhi 3247. A 30-second du'a counts as ibadah."
        ),
        Entry(
            "إِذَا سَأَلْتَ فَاسْأَلِ اللَّهَ",
            "\"When you ask, ask Allah.\" — Tirmidhi 2516. What do you need? Ask Him now."
        ),
        Entry(
            "لَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ",
            "\"Do not despair of Allah's mercy.\" — Quran 12:87. He has not abandoned you."
        ),
        Entry(
            "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ",
            "\"O Allah, I ask You for wellbeing.\" The Prophet ﷺ said no du'a is greater. — Tirmidhi 3514"
        ),
        Entry(
            "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً",
            "\"Our Lord, grant us good in this life and the next.\" — Quran 2:201. A perfect du'a, any moment."
        ),
        Entry(
            "اللَّهُمَّ أَصْلِحْ لِي دِينِي",
            "\"O Allah, set right my religion, my worldly affairs, and my hereafter.\" — Sahih Muslim 2720"
        ),

        // ── Motivation / character ────────────────────────────────────────────
        Entry(
            "خَيْرُ النَّاسِ أَنْفَعُهُمْ",
            "\"The best of people are those most beneficial to others.\" — Al-Mu'jam al-Awsat. Who can you help today?"
        ),
        Entry(
            "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ",
            "\"A Muslim is one from whose tongue and hand others are safe.\" — Sahih Bukhari 10. Guard yours."
        ),
        Entry(
            "إِنَّ اللَّهَ يُحِبُّ الْمُؤْمِنَ الْقَوِيَّ",
            "\"Allah loves the strong believer.\" — Sahih Muslim 2664. Be strong — in faith, in character."
        ),
        Entry(
            "الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ",
            "\"A kind word is charity.\" — Sahih Bukhari 2989. One message to someone you care about?"
        ),
        Entry(
            "ابْتَسِمْ فَإِنَّ ابْتِسَامَتَكَ صَدَقَةٌ",
            "\"Smile — for your smile is charity.\" — Tirmidhi 1956. One small act of goodness. Right now."
        ),
        Entry(
            "أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ",
            "\"The most beloved deeds to Allah are those done consistently, even if small.\" — Sahih Bukhari 6465"
        ),
        Entry(
            "الدِّينُ يُسْرٌ",
            "\"The religion is ease.\" — Sahih Bukhari 39. Small, consistent acts. Not perfection. Start now."
        ),

        // ── Ākhirah reminders ─────────────────────────────────────────────────
        Entry(
            "كُنْ فِي الدُّنْيَا كَأَنَّكَ غَرِيبٌ",
            "\"Be in this world as if you are a stranger passing through.\" — Sahih Bukhari 6416. What truly matters?"
        ),
        Entry(
            "الْعَاقِلُ مَنْ دَانَ نَفْسَهُ",
            "\"Wise is he who disciplines himself and works for what comes after death.\" — Tirmidhi 2459"
        ),
        Entry(
            "مَا الدُّنْيَا إِلَّا مَتَاعُ الْغُرُورِ",
            "\"The life of this world is nothing but the enjoyment of deception.\" — Quran 3:185. Spend it wisely."
        ),
        Entry(
            "يَوْمَ لَا يَنفَعُ مَالٌ وَلَا بَنُونَ",
            "\"The Day when wealth and children will be of no avail — except a sound heart.\" — Quran 26:88-89"
        ),
        Entry(
            "الْجَنَّةُ أَقْرَبُ إِلَيْكَ",
            "\"Jannah is nearer to you than your shoelace.\" — Sahih Bukhari 6488. A single good deed can tip the scale."
        ),
        Entry(
            "فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ",
            "\"Whoever does an atom's weight of good will see it.\" — Quran 99:7. Every single act counts."
        ),
        Entry(
            "اللَّهُمَّ أَحْسِنْ خَاتِمَتَنَا",
            "\"O Allah, grant us a good ending.\" Make this the du'a of your life — starting now."
        )
    )
}
