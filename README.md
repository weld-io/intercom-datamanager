# intercom-datamanager

Command line tool for Intercom.io data management.

## Usage

	yarn start ../data/id.csv profile=intercom test=true
	# or: node lib/intercom-datamanager ../data/id.csv profile=intercom test=true

## References

https://github.com/tarunc/intercom.io

http://doc.intercom.io/api/#bulk-user-creation

## Intercom fields

* `user_id`	(yes if no email)	a unique string identifier for the user. It is required on creation if an email is not supplied.
* `email`	(yes if no user_id)	the user’s email address. It is required on creation if a user_id is not supplied.
* `id`	(no)	The id may be used for user updates.
* `remote_created_at`	(timestamp)	The time the user was created by you
* `name`	(no)	The user’s full name
* `last_seen_ip`	(no)	An ip address (e.g. “1.2.3.4”) representing the last ip address the user visited your application from. (Used for updating location_data)
* `custom_attributes`	(no)	A hash of key/value pairs containing any other data about the user you want Intercom to store.*
* `last_seen_user_agent`	(no)	The user agent the user last visited your application with.
* `companies`	(no)	Identifies the companies this user belongs to.
* `last_request_at`	(no)	A UNIX timestamp representing the date the user last visited your application.
* `unsubscribed_from_emails`	(no)	A boolean value representing the users unsubscribed status. default value if not sent is false.
* `update_last_request_at`	(no)	A boolean value, which if true, instructs Intercom to update the users' last_request_at value to the current API service time in UTC. default value if not sent is false.
* `new_session`	(no)	A boolean value, which if true, instructs Intercom to register the request as a session.

	intercom.createUser({
		"email" : "andres@eee",
		"user_id" : "54184c99a8f840bb0a000003",
		"name" : "Ben McRedmond2",
		"created_at" : 1257553080,
		"last_request_at" : 1300000000
		"last_seen_ip" : "1.2.3.4",
		"last_seen_user_agent" : "ie6",
		"companies" : [
			{
				"id" : 6,
				"name" : "Intercom",
				"created_at" : 103201,
				"plan" : "Messaging",
				"monthly_spend" : 50
			},
		],
		"custom_data" : {"plan" : "pro"}
	}, function(err, res) {
		console.log('Intercom:', err, res);
	});

## MailChimp fields

* "Email Address"
* "First Name"
* "Last Name"
* "Company"
* "Occupation"
* "Source"
* "Language"
* "Cohort"
* "Custom Message"
* "Work Role"
* "Special Groups"
* "Development Platforms"
* "MEMBER_RATING"
* "OPTIN_TIME"
* "OPTIN_IP"
* "CONFIRM_TIME"
* "CONFIRM_IP"
* "LATITUDE"
* "LONGITUDE"
* "GMTOFF"
* "DSTOFF"
* "TIMEZONE"
* "CC"
* "REGION"
* "LAST_CHANGED"
* "LEID"
* "EUID"
* "NOTES"
