var testMessagesData = {

    relatedSet : {},
    individual : {}
};

// A related set of messages
testMessagesData.relatedSet = [
{
    userid: '12121212',
    groupid: '999',
    timestamp: '2013-11-28T23:07:40+00:00',
    messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
},
{
    userid: '232323',
    groupid: '777',
    timestamp: '2013-11-29T23:05:40+00:00',
    messagetext: 'Second message.'
},
{
    userid: '232323',
    groupid: '777',
    timestamp: '2013-11-30T23:05:40+00:00',
    messagetext: 'Third message.'
},
{
    userid: '232323',
    groupid: '777',
    timestamp: '2013-11-25T23:05:40+00:00',
    messagetext: 'First message.'
}];

// One off group with no other related groups
testMessagesData.individual = {
    userid: '12121212',
    groupid: '999',
    timestamp: '2013-11-28T23:07:40+00:00',
    messagetext: 'In three words I can sum up everything I have learned about life: it goes on.'
};


module.exports = testMessagesData;