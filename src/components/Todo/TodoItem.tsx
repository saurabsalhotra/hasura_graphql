import * as React from "react";
import {
  GetMyTodosQuery,
  Todos,
  ToggleTodoMutation,
  ToggleTodoMutationVariables,
  Delete_TodosMutation,
  Delete_TodosMutationVariables
} from "../../generated/graphql";
import { GET_MY_TODOS } from "./TodoPrivateList";
import { gql, useMutation } from "@apollo/client";

interface TodoItemType {
  index: number;
  todo: Pick<Todos, "id" | "title" | "is_completed">;
}

const TOGGLE_TODO = gql`
  mutation toggleTodo($id: Int!, $isCompleted: Boolean!) {
    update_todos(
      where: { id: { _eq: $id } }
      _set: { is_completed: $isCompleted }
    ) {
      affected_rows
      returning {
        id
        title
        is_completed
      }
    }
  }
`;

const DELETE_TODO = gql`
  mutation delete_todos($id: Int!) {
    delete_todos(where: { id: { _eq: $id } }) {
      affected_rows
    }
  }
`;

const TodoItem = ({ index, todo }: TodoItemType) => {
  const [todoUpdate] = useMutation<ToggleTodoMutation,ToggleTodoMutationVariables>(TOGGLE_TODO, {
    update(cache, { data }) {
      const existingTodos: any = cache.readQuery<GetMyTodosQuery>({
        query: GET_MY_TODOS,
      });
      const newTodos = existingTodos!.todos.map((t: any) => {
        if (t.id === todo.id) {
          return { ...t, ...data!.update_todos!.returning[0] };
        } else {
          return t;
        }
      });
      cache.writeQuery<GetMyTodosQuery>({
        query: GET_MY_TODOS,
        data: { todos: newTodos },
      });
    },
  });

  const toggleTodo = () => {
    todoUpdate({
      variables: { id: todo.id, isCompleted: !todo.is_completed },
      optimisticResponse: {
        __typename: "mutation_root",
        update_todos: {
          __typename: "todos_mutation_response",
          affected_rows: 1,
          returning: [
            {
              __typename: "todos",
              id: todo.id,
              title: todo.title,
              is_completed: !todo.is_completed,
            },
          ],
        },
      },
    });
  };

  const [todoDelete] = useMutation<Delete_TodosMutation, Delete_TodosMutationVariables>(DELETE_TODO, {
    update(cache, {data}){
      const existingTodos = cache.readQuery<GetMyTodosQuery>({query: GET_MY_TODOS});
      const newTodos = existingTodos!.todos.filter((t)=>(t.id !== todo.id));
      cache.writeQuery<GetMyTodosQuery>({
          query:GET_MY_TODOS,
          data:{todos:newTodos}
      });
    }
  })
  const removeTodo = (e: any) => {
    e.preventDefault();
    e.stopPropagation();

    todoDelete({
      variables:{
        id:todo.id
      }
    })
  };

  return (
    <li key={index}>
      <div className="view">
        <div className="round">
          <input
            checked={todo.is_completed}
            type="checkbox"
            id={todo.id!.toString()}
            onChange={() => toggleTodo()}
          />
          <label htmlFor={todo.id!.toString()} />
        </div>
      </div>

      <div className={"labelContent" + (todo.is_completed ? " completed" : "")}>
        <div>{todo.title}</div>
      </div>

      <button className="closeBtn" onClick={(e) => removeTodo(e)}>
        x
      </button>
    </li>
  );
};

export default TodoItem;
