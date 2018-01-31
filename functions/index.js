// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

let communityId;
let commentId;
let postId;
let type;
let topic;
let payload;

exports.notifyComment = functions.https.onRequest((request, response) => {
	communityId = request.body.communityId;
	commentId = request.body.commentId;
	postId = request.body.postId;
	type = "comment";
	sendNotification(type);
	response.status(200).send(postId);
});

function sendNotification(type) {
	//send notification only if the id exists in database
    if (type === "comment") {
        let ref = admin.database().ref("Posts/" + communityId + "/comments/" + postId + "/" + commentId);
        ref.once("value", function(snapshot) {
            let commentData = snapshot.val();
            if (commentData != null) {
                //Retrieve the username from database
                let userRef = admin.database().ref("user_details").child(commentData.creator);
                userRef.once("value", function(snapshot) {
                    let user = snapshot.val();
                    topic = String(postId);
                    payload = {
                        //notification: {
                        //    title: String(user.userName).concat(" has commented"),
                        //    body: String(commentData.comment)
                        //},
                        data: {
                            type: "comment",
                            userId: String(commentData.creator),
                            commentId: String(commentId),
                            postId: String(postId),
                            title: String(user.userName).concat(":"),
                            body: String(commentData.comment)
                        }
                    };

                    //Send the notification
                    admin.messaging().sendToTopic(topic, payload)
                        .then(function(response) {
                            console.log(topic);
                            console.log(payload);
                            console.log("Successfully sent message:", response);
                        })
                        .catch(function(error) {
                            console.log("Error sending message:", error);
                        });

                    //Store the notification in the database
                    let notificationRef = admin.database().ref("notifications").child(communityId);
                    let notificationId = notificationRef.push().key;
                    let date = new Date();

                    let notification = {
                    	type: "comment",
                        content: String(commentData.comment),
                        senderId: String(commentData.creator),
                        commentId: String(commentId),
                        postId: String(postId),
                        timestamp: date.getTime()
                    };
                    notificationRef.child(notificationId).set(notification);
                });
            }
        });
    }
}
