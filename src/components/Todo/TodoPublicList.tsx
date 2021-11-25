import { gql, useSubscription, useApolloClient } from "@apollo/client";
import React, { Fragment, useState, useRef, useEffect } from "react";
import {
  NotifyNewPublicTodosSubscription,
  Todos,
} from "../../generated/graphql";
import TaskItem from "./TaskItem";

type TodoItem = {
  id: number;
  title: string;
  user: { name: string };
};

type publicListProps = {
  latestTodo?: TodoItem | null;
};

const TodoPublicList = (props: publicListProps) => {
  const [olderTodosAvailable, setOlderTodosAvailable] = useState(
    props.latestTodo ? true : false
  );
  const [newTodosCount, setNewTodosCount] = useState(0);

  const [error, setError] = useState<Boolean>(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  let oldestTodoId = useRef(props.latestTodo ? props.latestTodo.id + 1 : 0); // This is done this way so that during init we fetch the latest todo along with 6 older todos. see query
  let newestTodoId = useRef(props.latestTodo ? props.latestTodo.id : 0);

  console.log("newestTodoId while render "+ props.latestTodo?.id +" " + newestTodoId.current);

  if (todos && todos.length) {
    oldestTodoId.current = todos[todos.length - 1].id;
    newestTodoId.current = todos[0].id;
  }

  const client = useApolloClient();

  const loadOlder = async () => {
    const GET_OLD_PUBLIC_TODOS = gql`
      query getOldPublicTodos($oldestTodo: Int!) {
        todos(
          where: { is_public: { _eq: true }, id: { _lt: $oldestTodo } }
          limit: 7
          order_by: { created_at: desc }
        ) {
          id
          is_completed
          title
          user {
            name
          }
        }
      }
    `;
    const { data, networkStatus } = await client.query({
      query: GET_OLD_PUBLIC_TODOS,
      variables: { oldestTodo: oldestTodoId.current },
    });

    if (data.todos && data.todos.length) {
      setTodos((prevTodos) => {
        if (prevTodos) {
          return [...prevTodos, ...data.todos];
        } else {
          return data.todos;
        }
      });
      oldestTodoId.current = data.todos[data.todos.length - 1].id;
    } else {
      setOlderTodosAvailable(false);
    }

    if (networkStatus === 8) {
      console.error(data);
      setError(true);
    }
  };

  useEffect(() => {
    loadOlder();
  }, []);

  const loadNew = async () => {
    const GET_NEW_PUBLIC_TODOS = gql`
      query getNewPublicTodos($latestVisibleId: Int) {
        todos(
          where: { is_public: { _eq: true }, id: { _gt: $latestVisibleId } }
          order_by: { created_at: desc }
        ) {
          id
          title
          created_at
          user {
            name
          }
        }
      }
    `;
    console.log("newestTodoId loadnew" + newestTodoId.current);
    const { data, networkStatus } = await client.query({
      query: GET_NEW_PUBLIC_TODOS,
      variables: {
        latestVisibleId: newestTodoId.current,
      },
    });
    if (data && data.todos) {
      setTodos((prevState) => {
        if (prevState) {
          return [...data.todos, ...prevState];
        } else {
          return data.todos;
        }
      });
      setNewTodosCount(0);
      newestTodoId.current = data.todos[0].id;
    }
    if (networkStatus === 8) {
      console.error(data);
      setError(true);
    }
  };

  useEffect(() => {
    if (props.latestTodo && props.latestTodo.id! > newestTodoId.current) {
      setNewTodosCount((n) => n + 1);
      newestTodoId.current = props.latestTodo.id!; // why is this here?
      console.log("newestTodoId use effect " + newestTodoId.current);
    }
  }, [props.latestTodo]);

  return (
    <Fragment>
      <div className="todoListWrapper">
        {newTodosCount !== 0 && (
          <div className={"loadMoreSection"} onClick={() => loadNew()}>
            New tasks have arrived! ({newTodosCount.toString()})
          </div>
        )}

        <ul>
          {todos &&
            todos.map((todo, index) => {
              return <TaskItem key={index} index={index} todo={todo} />;
            })}
        </ul>

        <div className={"loadMoreSection"} onClick={() => loadOlder()}>
          {olderTodosAvailable ? "Load older tasks" : "No more public tasks!"}
        </div>
      </div>
    </Fragment>
  );
};

const TodoPublicListSubscription = () => {
  const NOTIFY_NEW_PUBLIC_TODOS = gql`
    subscription notifyNewPublicTodos {
      todos(
        where: { is_public: { _eq: true } }
        limit: 1
        order_by: { created_at: desc }
      ) {
        id
        title
        user {
          name
        }
        created_at
      }
    }
  `;

  const { loading, error, data } =
    useSubscription<NotifyNewPublicTodosSubscription>(NOTIFY_NEW_PUBLIC_TODOS);
  if (loading) {
    return <span>Loading...</span>;
  }
  if (error || !data) {
    return <span>Error</span>;
  }

  console.log(data.todos[0]);
  return (
    <TodoPublicList latestTodo={data.todos.length ? data.todos[0] : null} />
  );
};

export default TodoPublicListSubscription;
