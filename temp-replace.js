const fs = require('fs');

try {
    const file = 'app/play/page.tsx';
    let content = fs.readFileSync(file, 'utf8');

    const imports = `
import HeroProfile from './components/HeroProfile';
import VillagesSection from './components/VillagesSection';
import SocialSection from './components/SocialSection';
`;

    // Only add imports once
    if (!content.includes('import HeroProfile')) {
        content = content.replace("import Header from '../../components/Header';", "import Header from '../../components/Header';" + imports);
    }

    const startMatch = '<main className="max-w-6xl mx-auto px-4 pb-20">';
    const endMatch = '</main>';
    const startIdx = content.indexOf(startMatch);
    const endIdx = content.indexOf(endMatch, startIdx);

    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Could not find <main> tags');
    }

    const newMain = `<main className="max-w-6xl mx-auto px-4 pb-20">
                <HeroProfile
                    userData={userData}
                    notifications={notifications}
                    showNotifications={showNotifications}
                    setShowNotifications={setShowNotifications}
                    handleDeleteNotif={handleDeleteNotif}
                    handleAcceptFriend={handleAcceptFriend}
                    handleRejectFriend={handleRejectFriend}
                    handleAcceptGroupInvite={handleAcceptGroupInvite}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <VillagesSection
                        villages={villages}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        searchVillage={searchVillage}
                        setSearchVillage={setSearchVillage}
                    />

                    <SocialSection
                        user={user}
                        userData={userData}
                        group={group}
                        handleLeaveGroup={handleLeaveGroup}
                        searchPlayer={searchPlayer}
                        setSearchPlayer={setSearchPlayer}
                        isSearchingPlayer={isSearchingPlayer}
                        playerSearchResults={playerSearchResults}
                        friends={friends}
                        sentRequests={sentRequests}
                        handleSendFriendRequest={handleSendFriendRequest}
                        friendsStatuses={friendsStatuses}
                        friendsGroups={friendsGroups}
                        handleInviteToGroup={handleInviteToGroup}
                    />
                </div>
            </main>`;

    content = content.substring(0, startIdx) + newMain + content.substring(endIdx + endMatch.length);

    fs.writeFileSync(file, content);
    console.log('Successfully replaced file content');
} catch (e) {
    console.error('Error:', e);
}
