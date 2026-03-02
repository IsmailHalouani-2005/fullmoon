const fs = require('fs');
const path = require('path');

try {
    const file = path.join(__dirname, 'app/play/page.tsx');
    let content = fs.readFileSync(file, 'utf8');

    // Remove imports
    content = content.replace(/import HeroProfile from '\.\/components\/HeroProfile';\r?\n?/, '');
    content = content.replace(/import VillagesSection from '\.\/components\/VillagesSection';\r?\n?/, '');
    content = content.replace(/import SocialSection from '\.\/components\/SocialSection';\r?\n?/, '');

    const startMatch = '<main className="max-w-6xl mx-auto px-4 pb-20">';
    const endMatch = '</main>';
    const startIdx = content.indexOf(startMatch);
    const endIdx = content.indexOf(endMatch, startIdx);

    if (startIdx !== -1 && endIdx !== -1) {
        const newMain = `<main className="max-w-6xl mx-auto px-4 pb-20">
                {/* TOP SECTION: Hero & Profile */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-12 mb-16 gap-12">

                    {/* Left: Actions */}
                    <div className="flex flex-col items-center md:items-start flex-1">
                        <h1 className="font-enchanted text-6xl md:text-8xl text-dark tracking-wide mb-10">Prêts pour chasser ?</h1>
                        <div className="flex flex-col w-full max-w-sm gap-4">
                            <button className="w-full bg-secondary text-white font-bold text-xl py-4 rounded shadow-md hover:-translate-y-1 transition-transform uppercase tracking-wide">
                                REJOINDRE UN VILLAGE RAPIDE
                            </button>
                            <button className="w-full bg-dark text-white font-bold text-xl py-4 rounded shadow-md hover:-translate-y-1 transition-transform uppercase tracking-wide">
                                CRÉER SON VILLAGE
                            </button>
                        </div>
                    </div>

                    {/* Right: User Profile Indicator & Notifications */}
                    <div className="flex flex-col items-center">
                        <div className="relative mb-6">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-3 bg-dark rounded-full shadow-md hover:-translate-y-1 transition-transform cursor-pointer"
                            >
                                <span className="text-2xl">🔔</span>
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute top-full right-0 mt-4 w-80 bg-white border-2 border-dark rounded-lg shadow-2xl z-50 overflow-hidden">
                                    <div className="p-4 bg-dark text-white border-b border-dark">
                                        <h3 className="font-bold">Notifications</h3>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <p className="p-4 text-center text-dark/50 text-sm">Aucune nouvelle notification.</p>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 flex flex-col gap-2 relative">
                                                    <div className="flex items-center gap-3 pr-4">
                                                        <div className="w-10 h-10 rounded-full bg-dark overflow-hidden relative flex-shrink-0">
                                                            <Image src={notif.fromPhotoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Expéditeur" fill className="object-cover" />
                                                        </div>
                                                        <p className="text-sm">
                                                            <span className="font-bold">{notif.fromPseudo}</span>
                                                            {notif.type === 'friend_request' && " vous a envoyé une demande d'ami."}
                                                            {notif.type === 'friend_request_accepted' && " a accepté votre demande d'ami."}
                                                            {notif.type === 'friend_request_rejected' && " a refusé votre demande d'ami."}
                                                            {notif.type === 'group_invite' && " vous a invité à rejoindre son groupe."}
                                                        </p>
                                                    </div>

                                                    {(notif.type !== 'friend_request' && notif.type !== 'group_invite') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteNotif(notif.id); }}
                                                            className="absolute top-4 right-4 text-dark/40 hover:text-dark font-bold cursor-pointer"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}

                                                    {notif.type === 'friend_request' && (
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => handleAcceptFriend(notif)}
                                                                className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded"
                                                            >
                                                                Accepter
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectFriend(notif)}
                                                                className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded"
                                                            >
                                                                Refuser
                                                            </button>
                                                        </div>
                                                    )}

                                                    {notif.type === 'group_invite' && (
                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={() => handleAcceptGroupInvite(notif)}
                                                                className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded transition-transform hover:scale-105"
                                                            >
                                                                Rejoindre
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteNotif(notif.id)}
                                                                className="flex-1 bg-red-500 text-white text-xs font-bold py-2 rounded transition-transform hover:scale-105"
                                                            >
                                                                Refuser
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-center cursor-pointer group" onClick={() => router.push('/profil')}>
                            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-[8px] border-dark bg-[#E3D1A5] shadow-xl overflow-hidden mb-4 group-hover:scale-105 transition-transform">
                                {/* Moon background illusion */}
                                <div className="absolute inset-0 bg-[url('/assets/images/icones/village_batiments.png')] bg-cover opacity-20 bg-center"></div>
                                <Image
                                    src={userData?.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"}
                                    alt="Profil"
                                    fill
                                    className="object-cover z-10"
                                />
                            </div>
                            <h2 className="font-bold text-2xl text-dark tracking-wide">{userData?.pseudo || "Joueur"}</h2>
                            <p className="text-dark/70 text-lg font-semibold">{userData?.points || 0} pts</p>
                        </div>
                    </div>
                </div>

                {/* MIDDLE SECTION: Search & Filters */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
                    {/* Search Input */}
                    <div className="relative w-full lg:w-[60%] border-2 border-dark rounded-md bg-white">
                        <input
                            type="text"
                            placeholder="Rechercher le nom d'un village..."
                            value={searchVillage}
                            onChange={(e) => setSearchVillage(e.target.value)}
                            className="w-full px-4 py-3 bg-transparent text-dark placeholder-dark/50 focus:outline-none"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <span className="text-2xl">🔍</span> {/* Replace with SVG icon later if needed */}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex w-full lg:w-auto bg-dark p-1 rounded-md overflow-hidden">
                        {['Toutes', 'Publiques', 'Privés', 'Amis'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={\`flex-1 lg:flex-none px-6 py-2.5 font-bold text-sm transition-colors rounded \${activeTab === tab ? 'bg-secondary text-white' : 'text-white/80 hover:bg-white/10'}\`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* BOTTOM SECTION: Split View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

                    {/* LEFT LIST: Villages (Left 7-8 columns) */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                        <p className="text-xs text-dark/70 -mb-2 font-semibold">Rejoindre un village : ({villages.filter(v =>
                            (activeTab === 'Toutes') ||
                            (activeTab === 'Publiques' && !v.isPrivate) ||
                            (activeTab === 'Privés' && v.isPrivate)
                        ).filter(v => v.name?.toLowerCase().includes(searchVillage.toLowerCase())).length})</p>

                        {/* Real Village Cards from Firestore */}
                        {villages.filter(v =>
                            (activeTab === 'Toutes') ||
                            (activeTab === 'Publiques' && !v.isPrivate) ||
                            (activeTab === 'Privés' && v.isPrivate)
                        ).filter(v =>
                            v.name?.toLowerCase().includes(searchVillage.toLowerCase())
                        ).map((village) => (
                            <div key={village.id} className="flex relative items-center rounded-lg shadow-sm border border-dark/20 pr-4 transition-transform hover:-translate-y-1 cursor-pointer" style={{ background: 'linear-gradient(to right, #E3D1A5 15%, #F9F4DF 15%)' }}>
                                {/* Big Profile Overhang */}
                                <div className="absolute left-0 -translate-x-4 w-24 h-24 rounded-full border-[3px] border-dark bg-[#E3D1A5] overflow-hidden flex-shrink-0 z-10">
                                    <Image src={village.hostPhoto || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Avatar" fill className="object-cover" />
                                </div>

                                <div className="flex-1 pl-28 py-6 pr-4 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <h3 className="font-bold text-xl text-dark leading-tight">{village.name}</h3>
                                        <p className="text-dark/60 text-sm flex items-center gap-1">
                                            {village.mode} <span>{village.isMicro ? '🎙️' : '🔇'}</span>
                                        </p>
                                        <p className="font-bold text-sm mt-1">{village.hostPseudo}</p>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="font-enchanted tracking-widest text-2xl text-dark">{village.isPrivate ? 'Privé' : 'Publique'}</span>
                                        <span className="bg-[#E0C09C] text-dark font-bold text-xs px-3 py-1 rounded-full">{village.playerCount || 1} / {village.maxPlayers || 16}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT PANEL: Lobby & Social (Right 4-5 columns) */}
                    <div className="lg:col-span-5 bg-dark text-white rounded-lg p-6 flex flex-col h-[600px] border-2 border-dark/90 shadow-2xl">

                        {/* Lobby Players */}
                        <div className="mb-6 flex-shrink-0">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-white/60 text-sm">Groupe : ({group?.players?.length || 1} / 18 maximal)</h3>
                                {userData?.currentGroupId && userData.currentGroupId !== user?.uid && (
                                    <button onClick={handleLeaveGroup} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase transition-colors cursor-pointer">Quitter</button>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {group?.players?.map((p: any) => (
                                    <div key={p.uid} className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity" onClick={() => router.push(\`/profil/\${p.uid}\`)}>
                                        <div className={\`relative w-10 h-10 rounded-full border \${p.uid === group?.hostId ? 'border-yellow-400' : 'border-[#E3D1A5]'} bg-[#E3D1A5]/20 overflow-hidden\`}>
                                            <Image src={p.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Joueur" fill className="object-cover" />
                                            {p.uid === group?.hostId && (
                                                <div className="absolute top-0 right-0 text-[10px] bg-dark rounded-full leading-none p-0.5">👑</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold truncate max-w-[80px]">{p.pseudo} {p.uid === user?.uid && "(Moi)"}</span>
                                            <span className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>Connecté</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Placeholder for remaining slots: Show only one if not full */}
                                {group?.players && group.players.length < 18 && (
                                    <div className="flex items-center gap-3 opacity-30">
                                        <div className="w-10 h-10 rounded-full border border-dashed border-white/50 flex items-center justify-center">
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white/50">Libre</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search Input for Social */}
                        <div className="relative w-full border border-white/20 rounded-md bg-white/5 mb-6 flex-shrink-0">
                            <input
                                type="text"
                                placeholder="Rechercher un joueur..."
                                value={searchPlayer}
                                onChange={(e) => setSearchPlayer(e.target.value)}
                                className="w-full px-3 py-2 bg-transparent text-white text-sm focus:outline-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <span className="text-lg text-dark/50">🔍</span>
                            </div>

                            {/* Search Results Dropdown */}
                            {searchPlayer.trim() && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-dark border-2 border-white/20 rounded-md shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                    {isSearchingPlayer ? (
                                        <p className="p-3 text-xs text-secondary text-center">Recherche en cours...</p>
                                    ) : playerSearchResults.length > 0 ? (
                                        playerSearchResults.map(p => {
                                            const isFriend = friends.some(f => f.friendId === p.id);
                                            const isPending = sentRequests.includes(p.id);

                                            return (
                                                <div key={p.id} className="flex flex-col md:flex-row items-center justify-between p-3 border-b border-white/5 hover:bg-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full border border-[#E3D1A5] bg-[#E3D1A5]/20 overflow-hidden relative flex-shrink-0">
                                                            <Image src={p.photoURL || p.photo_profil || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Ami" fill className="object-cover" />
                                                        </div>
                                                        <span className="text-sm font-bold truncate max-w-[100px]">{p.pseudo || p.nom}</span>
                                                    </div>

                                                    {isFriend ? (
                                                        <span className="text-green-400 text-xs font-bold px-3 py-1">Ami</span>
                                                    ) : isPending ? (
                                                        <span className="text-white/50 text-xs font-bold px-3 py-1">En attente</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleSendFriendRequest(p.id)}
                                                            className="bg-secondary text-dark text-xs font-bold px-3 py-1 rounded shadow-sm hover:bg-[#c9a785] transition-colors mt-2 md:mt-0 cursor-pointer"
                                                        >
                                                            + Ajouter
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="p-3 text-xs text-white/50 text-center">Aucun joueur trouvé.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Friends List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <h3 className="text-white/60 text-sm mb-3">Amis : ({friends.length})</h3>

                            <div className="flex flex-col gap-4">
                                {friends.length === 0 ? (
                                    <p className="text-white/40 text-xs italic text-center mt-4">Vous n'avez pas encore d'amis. Cherchez un joueur pour l'ajouter !</p>
                                ) : (
                                    friends.map(friend => {
                                        const hash = friend.friendId ? friend.friendId.charCodeAt(0) % 3 : 0;
                                        const isOnline = hash === 0 || hash === 1; // 66% chance online for demo
                                        const isInGame = hash === 1; // 33% chance in game
                                        
                                        const fStatus = friendsStatuses[friend.friendId];
                                        const fGroup = fStatus?.currentGroupId ? friendsGroups[fStatus.currentGroupId] : null;
                                        const inGroup = fGroup && fGroup.players && fGroup.players.length > 1;

                                        return (
                                            <div key={friend.id} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-10 h-10 rounded-full border border-dark bg-[#E3D1A5]/20 overflow-hidden text-dark flex items-center justify-center">
                                                        <Image src={friend.photoURL || "/assets/images/icones/Photo_Profil-transparent.png"} alt="Ami" fill className="object-cover" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold truncate max-w-[120px]">{friend.pseudo}</span>
                                                        <span className={\`text-[10px] flex items-center gap-1 \${isOnline ? 'text-green-400' : 'text-red-500'}\`}>
                                                            <span className={\`w-1.5 h-1.5 rounded-full \${isOnline ? 'bg-green-400' : 'bg-red-500'}\`}></span>
                                                            {isInGame ? 'En jeu' : isOnline ? 'En ligne' : 'Hors ligne'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 items-center text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {inGroup ? (
                                                        <span className="text-secondary text-xs font-bold px-2 py-1 mr-2 bg-secondary/10 rounded">En Groupe</span>
                                                    ) : (
                                                        <button className="hover:text-white cursor-pointer mr-2" title="Inviter au groupe" onClick={() => handleInviteToGroup(friend.friendId, friend.pseudo)}>➕</button>
                                                    )}
                                                    {isInGame && (
                                                        <button className="hover:text-white cursor-pointer" title="Voir partie" onClick={() => alert("Fonctionnalité Spectateur à venir.")}>👁️</button>
                                                    )}
                                                    {isOnline && (
                                                        <button className="hover:text-white cursor-pointer" title="Message" onClick={() => alert("Fonctionnalité Message à venir.")}>✉️</button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>`;

        content = content.substring(0, startIdx) + newMain + content.substring(endIdx + endMatch.length);
        fs.writeFileSync(file, content);
        console.log('Restored old content');

        // Delete components directory recursively
        const componentsDir = path.join(__dirname, 'app/play/components');
        if (fs.existsSync(componentsDir)) {
            fs.rmSync(componentsDir, { recursive: true, force: true });
            console.log('Deleted components directory');
        }
    } else {
        console.error('Could not find existing <main> tags to replace');
    }
} catch (e) {
    console.error('Error:', e);
}
