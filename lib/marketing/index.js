/**
 * lib/marketing/index.js
 * منظومة التسويق الذكي المتكاملة - شركة الزمردة كوزماتيكس
 */

const { APPROVED_SPECS, reviewMarketingContent } = require('./price-spec-guardian');
const {
    CAMPAIGN_ANGLES,
    generateCampaignIdea,
    generateAdCopies,
    generateCreativeBrief,
    generateVideoScript,
    createFullCampaignPackage,
    generateHyperLocalCommunityCopy
} = require('./campaign-engine');
const contentLibrary = require('./content-library');
const publisher = require('./publisher');
const messengerEscalator = require('./messenger-escalator');
const facebookWarmupManager = require('./facebook-warmup-manager');

module.exports = {
    APPROVED_SPECS,
    reviewMarketingContent,
    CAMPAIGN_ANGLES,
    generateCampaignIdea,
    generateAdCopies,
    generateCreativeBrief,
    generateVideoScript,
    createFullCampaignPackage,
    generateHyperLocalCommunityCopy,
    contentLibrary,
    publisher,
    messengerEscalator,
    facebookWarmupManager
};
