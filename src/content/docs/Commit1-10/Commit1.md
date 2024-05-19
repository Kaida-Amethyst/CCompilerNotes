---
title: 1. Integer Execution
---

## Commit log

```plaintext
Compile an integer to an exectuable that exits with the given number
```

我们的编译器，只可以给一个数，然后把这个数，编译成一个可执行文件，最后这个可执行文件的返回值就是这个数。

## 做法

在目录下新建三个文件：`main.c`，`Makefile`和`test.sh`。`main.c`就是我们的主体内容，`Makefile`用于我们的项目，`test.sh`用于测试我们的代码。

一般工程学上我们会把这编写项目的部分和测试的部分分开来，但这里为了学习之用，我们就只是按顺序介绍。

## C文件

C文件非常简单，它的主体就是打印几行x86代码。然后需要可以接收一个数。程序内容如下：

```c
#include <stdio.h>
#include <stdlib.h>

int main (int argc, char** argv) {
  if (argc != 2) {
    fprintf(stderr, "%s, invalid number of arguments.\n", argv[0]);
    return 1;
  }

  printf("  .global main\n");
  printf("main:\n");
  printf("  mov $%d, %%rax\n", atoi(argv[1]));
  printf("  ret\n");
  return 0;
}
```

上面的代码实在是过于简单，因此就不再赘述。接下来看Makefile。

## Makefile

```Makefile
CFLAGS=-std=c11 -g -fno-common

chibicc: main.o
	$(CC) -o chibicc main.o $(LDFLAGS)

test: chibicc
	./test.sh

clean:
	rm -f chibicc *.o *~ tmp*

.PHONY: test clean
```

Makefile注意下，第一行的CFLAGS应该是相当于一个全局变量，它直接作用于后面的`$(CC)`，但是我们这里没有指定这个`CC`到底是用的什么，是`gcc`还是`clang`，因此这里实际上应该会跟着当时的系统来，我这里测试的时候，是直接用了liunx下的cc。

然后的`$(LDFLAGS)`，应当又是一个Makefile的一个内置变量。

## test.sh

```bash
#!/bin/bash
assert() {
  expected="$1"
  input="$2"

  ./chibicc "$input" > tmp.s || exit
  gcc -static -o tmp tmp.s
  ./tmp
  actual="$?"
  
  if [ "$actual" = "$expected" ]; then
    echo "$input ==> $actual"
  else
    echo "$input ==> $expected expected, but got $actual"
    exit 1
  fi
}

assert 0 0
assert 42 42

echo OK
```

第2行声明一个函数，第3,4行分别声明一个变量，将函数接收的两个参数赋值。

第6行就是编译，注意这里有一个`||`，意思是说，如果前面的命令不成功，就执行后面的命令。

第7行把得到的tmp.s进行编译。这里注意就是前面在main.c中看到的那几行x86汇编。

第8行执行得到的tmp可执行文件。

第9行需要注解一下，tmp.s中的那几行x86汇编是不会打印任何东西的。但是实际上，任何一个程序的执行，包括linux中每一个指令的执行，都有一个返回值（回忆一下每次写C语言程序中最后一句`return 0`）。再回忆一下CSAPP中的第三章对程序返回值的介绍，就明白，一个程序的返回值在`ret`指令前放在`rax`寄存器里面，因此这里我们就明白，给chibicc这个程序传入不同的值，最后生成的tmp可执行文件的返回值是不同的。那么怎么样能够看到程序的返回值？linux提供了`$?`机制，可以看到上一个执行的指令的返回值。

```shell
$ ./chibicc 100 > tmp.s && gcc -static -o tmp tmp.s
$ ./tmp
$ echo "$?"
100
$ echo "$?"
0
```

到这里，我们就分析完第一个commit了。使用make可以来尝试一下了。

‍
