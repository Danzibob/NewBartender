import logging,time,signal,sys,json,serial,math,random
import RPi.GPIO as GPIO
from six.moves import input
from threading import Thread, Event
import threading
from queue import Queue
from . import (assistant_helpers, auth_helpers, audio_helpers, common_settings)
from google.assistant.embedded.v1alpha1 import embedded_assistant_pb2
from google.rpc import code_pb2
from google.cloud import pubsub

PUBSUB_PROJECT_ID = 'genuine-quasar-141612'
SER_DEVICE = '/dev/ttyACM0' # ensure correct file descriptor for connected arduino
PUSH_TO_TALK = True
PUSH_TO_TALK_PIN = 26
PUMP_SPEED = 0.056356667 # 100 ml / min = 0.056356667 oz / sec
NUM_BOTTLES = 8
PRIME_WHICH = None

BOTTLES = ["Strawberry Daiquiri Mix","Passion Fruit Martini Mix","Vodka","White Rum","Tequila","Orange Juice","Blue Curacao"]

class SubscriptionThread(Thread):

	def __init__(self, msg_queue):

		Thread.__init__(self)
		self.shutdown_flag = Event()
		self.msg_queue = msg_queue;
		pubsub_client = pubsub.Client(project=PUBSUB_PROJECT_ID, credentials=creds)
		topic_name = 'MMM'
		topic = pubsub_client.topic(topic_name)
		subscription_name = 'PythonMocktailsMixerSub'
		self.subscription = topic.subscription(subscription_name)
		try:
			self.subscription.create()
			logging.info('Subscription created')
		except Exception as e:
			print(e)
			logging.info('Subscription already exists')

	def run(self):
	""" Poll for new messages from the pull subscription """

		while True:

			# pull messages
			results = self.subscription.pull(return_immediately=True)

			for ack_id, message in results:
				json_string = str(message.data)[3:-2]
				json_string = json_string.replace('\\\\', '')
				logging.info(json_string)

				# create dict from json string
				try:
					json_obj = json.loads(json_string)
				except Exception as e:
					logging.error('JSON Error: %s', e)

				# get action from json
				action = json_obj['action']
				print('pub/sub: ' + action)

				# perform action based on action
				if action == 'make_drink':
					for ingredient in json_obj['ingredients']:
						bottle = BOTTLES.index(ingredient)
						amount = json_obj['ingredients'][ingredient]
						self.msg_queue.put("{},{}".format(bottle,amount))
					self.msg_queue.put("MAKE")
					#Do some other flashy thing

				elif action == 'flash_unavailable':
					#Do the flashy thing

				elif action == 'flash_busy':
					#Do the flashy thing

			# ack received message
			if results:
				self.subscription.acknowledge([ack_id for ack_id, message in results])
			#Wait to poll again
			time.sleep(.25)

class SerialThread(Thread):

  def __init__(self, msg_queue):
	Thread.__init__(self)
	self.shutdown_flag = Event()
	self.msg_queue = msg_queue;
	self.serial = serial.Serial(SER_DEVICE, 9600)

  def run(self):

	while not self.shutdown_flag.is_set():

	  if not self.msg_queue.empty():
		cmd = self.msg_queue.get()
		self.serial.write(str.encode(cmd))
		print('Serial sending ' + cmd)





if __name__ == '__main__':

	# set log level (DEBUG, INFO, ERROR)
	logging.basicConfig(level=logging.INFO)

	# handle SIGINT gracefully
	signal.signal(signal.SIGINT, signal_handler)

	# setup assistant
	ret_val = setup_assistant()
	if ret_val == 0:

		# create message queue for communicating between threads
		msg_q = Queue()

		# start serial thread
		serial_thread = SerialThread(msg_q)
		serial_thread.start()

		# create pub/sub subscription and start thread
		sub_thread = SubscriptionThread(msg_q)
		sub_thread.start()

		# start assistant thread
		assistant_thread = AssistantThread(msg_q)
		assistant_thread.start()

		# # wait for main to finish until assistant thread is done
		# assisstant_thread.join()

		if PUSH_TO_TALK:

			# setup push to talk and start thread
			GPIO.setmode(GPIO.BOARD)
			GPIO.setup(PUSH_TO_TALK_PIN, GPIO.IN)
			poll_thread = Thread(target=poll, args=([assistant_thread]))
			poll_thread.start()