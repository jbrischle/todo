import { Component, Injectable, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';

interface Todo {
    todo: string;
    label: string;
    completed: boolean;
    dateUpdated: Date;
    dateCreated: Date;
}

interface TodoList {
    [label: string]: Todo[];
}

@Injectable({
                providedIn: 'root'
            })
class PersistenceService {
    private readonly _todoList$: BehaviorSubject<TodoList> = new BehaviorSubject({});
    private readonly _labelList$: BehaviorSubject<Set<string>> = new BehaviorSubject(new Set<string>());

    getToDoList(): Observable<TodoList> {
        return this._todoList$;
    }

    getLabelList(): Observable<Set<string>> {
        return this._labelList$;
    }

    addTodo(todo: Todo): void {
        const value: TodoList = this._todoList$.value;
        if (value[todo.label]) {
            value[todo.label].push(todo);
        } else {
            value[todo.label] = [todo];
        }
        this._todoList$.next(value);

        this._updateLabelList(todo.label);
    }

    updateToDoList(label: string, todos: Todo[]): void {
        const value: TodoList = this._todoList$.value;
        value[label] = todos;
        this._todoList$.next(value);
    }

    private _updateLabelList(label: string): void {
        const value: Set<string> = this._labelList$.value;
        value.add(label);
        this._labelList$.next(value);
    }
}

@Component({
               selector:    'app-root',
               templateUrl: './app.component.html',
               styleUrls:   ['./app.component.scss']
           })
export class AppComponent implements OnInit, OnDestroy {
    title = 'todo';
    todoList: TodoList = {};
    labels: Set<string> = new Set<string>();
    showLabelHints = false;
    private readonly _defaultNewTodo: Todo = {
        todo:        '',
        label:       'default',
        completed:   false,
        dateCreated: new Date(),
        dateUpdated: new Date()
    };
    newTodo: Todo = JSON.parse(JSON.stringify(this._defaultNewTodo));
    private readonly _destroy$ = new Subject<void>();
    private _draggingIndex: number | undefined;

    constructor(private readonly persistenceService: PersistenceService) {
    }

    onAddTodo(): void {
        const clonedToDo: Todo = JSON.parse(JSON.stringify(this.newTodo));
        this.persistenceService.addTodo(clonedToDo);
        this.newTodo = JSON.parse(JSON.stringify(this._defaultNewTodo));
    }

    onShowLabelHints(): void {
        this.showLabelHints = !this.showLabelHints;
    }

    getRelevantLabels(label: string): string[] {
        return Array.from(this.labels).filter(item => item.toLowerCase().includes(label.toLowerCase()));
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.unsubscribe();
    }

    ngOnInit(): void {
        this.persistenceService.getLabelList().pipe(takeUntil(this._destroy$)).subscribe(value => this.labels = value);
        this.persistenceService.getToDoList().pipe(takeUntil(this._destroy$)).subscribe(value => this.todoList = value);
    }

    onDragEnd(): void {
        this._draggingIndex = undefined;
    }

    onDragEnter(toIndex: number, label: string): void {
        if (this._draggingIndex !== toIndex) {
            this._reorderToDos(this._draggingIndex, toIndex, label);
        }
    }

    onDragStart(fromIndex: number): void {
        this._draggingIndex = fromIndex;
    }

    private _reorderToDos(fromIndex: number | undefined, toIndex: number, label: string): void {
        if (fromIndex === undefined) {
            return;
        }
        const toDos: Todo[] = this.todoList[label];
        const itemToBeReordered: Todo = toDos.splice(fromIndex, 1)[0];
        toDos.splice(toIndex, 0, itemToBeReordered);
        this._draggingIndex = toIndex;
        this.persistenceService.updateToDoList(label, toDos);
    }
}
