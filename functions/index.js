// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

let communityId;
let receiverId;
let message;
let sendId;
let commentId;
let postId;
let type;
let topic;
let payload;
let token;

exports.notifyComment = functions.https.onRequest((request, response) => {
	communityId = request.body.communityId;
	commentId = request.body.commentId;
	postId = request.body.postId;
	type = "comment";
	sendNotification(type);
	response.status(200).send(postId);
});

exports.notifyChat = functions.https.onRequest((request, response) => {
	sendId = request.body.sendId;
	receiverId = receiverId.body.receiverId;
	message = request.body.message;
	type = "message";
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

		if (type === "message") {

			let userRef = admin.database().ref("user_details").child(sendId);
			userRef.once("value", function(snapshot) {
					let user = snapshot.val();
					token = String(user.token);
					payload = {
							//notification: {
							//    title: String(user.userName).concat(" has commented"),
							//    body: String(commentData.comment)
							//},
							data: {
									type: "message",
									from: String(user.userName),
									message: String(message)
							}
					};

					admin.messaging().sendToDevice(token, payload)
			  .then(function(response) {
			    // See the MessagingDevicesResponse reference documentation for
			    // the contents of response.
					console.log(payload);
			    console.log("Successfully sent message:", response);
			  })
			  .catch(function(error) {
			    console.log("Error sending message:", error);
			  });
		});
  }
}
