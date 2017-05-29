import akka.actor.{Actor, ActorLogging, ActorRef, PoisonPill, Props, Terminated}

import scala.collection.mutable.ArrayBuffer

/**
  * Created by igor on 10/05/17.
  */
object MasterActor {

  def props(): Props = Props(new MasterActor)
}

class MasterActor extends Actor with ActorLogging {

  //TODO: Create some sort of "Database" actor.

  val watched = ArrayBuffer.empty[ActorRef]

  val webServer = context.actorOf(WebServerActor.props("localhost", 9080),"WebServerActor")
  watched += webServer

  val dataBase = context.actorOf(DatabaseActor.props(), "DatabaseActor")
  watched += dataBase

  // Watch all the child actors.
  watched.foreach(context.watch)

  override def preStart(): Unit = {
    log.info("Starting Master Actor...")
  }

  override def postStop(): Unit = {
    log.info("Stopping Master Actor...")
  }

  override def receive: Receive = {
    case Terminated(ref) =>
      watched -= ref
      log.info(s"Actor: ${ref.path} died.")
      controlledTermination()
    case someMessage => log.warning(s"Got the following message for some reason: $someMessage")
  }

  /**
    * Terminate the actor safely if, no more actors to watch, or the webServer actor is stopped.
    */
  def controlledTermination(): Unit = {
    // If webserver is not alive stop all the other actors and stop the application.
    if (!watched.contains(webServer)) watched.foreach(_ ! PoisonPill)
    if (watched.isEmpty) context.stop(self)
  }
}